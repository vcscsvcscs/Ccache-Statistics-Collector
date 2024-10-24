const fs = require('fs');
const tl = require('azure-pipelines-task-lib/task');
const axios = require('axios');

async function makeEndpointUrl(endpointArgs) {
    let url = endpointArgs.url || 'https://metron-prod.azure-api.net/interpreter';
    const project = endpointArgs.project || '';
    const interpreter = endpointArgs.interpreter || 'tpi_metrics';
    const onPremise = endpointArgs.onPremise || false;

    if (!project || onPremise) {
        return url;
    } else {
        const credentialsId = endpointArgs.projectCredentialsId || 'function_key_azure_kpi_framework';
        
        // Use Azure Pipelines library to retrieve the credentials
        const functionKey = await tl.getEndpointAuthorizationParameter(credentialsId, 'FUNCTION_KEY', false);
        
        // Construct the URL with the project and interpreter details
        return `${url}?code=${functionKey}&project=${project}&interpreter=${interpreter}`;
    }
}

async function sendData(data, endpointArgs) {
    try {
        const url = await makeEndpointUrl(endpointArgs);

        console.log(`Sending data to ${url}`);
        await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Data sent successfully.');
        return true;
    } catch (error) {
        console.error(`Failed to send data to the URL: ${error.message}`);
        return false;
    }
}

async function run() {
    try {
        const statsFile = tl.getVariable('ccacheStatsFile');
        const endpointArgs = {
            url: tl.getInput('endpointUrl', false),
            project: tl.getInput('project', false),
            projectCredentialsId: tl.getInput('projectCredentialsId', false),
            interpreter: tl.getInput('interpreter', false),
            onPremise: tl.getBoolInput('onPremise', false)
        };

        if (!statsFile || !fs.existsSync(statsFile)) {
            throw new Error('Ccache stats file not found.');
        }

        const ccacheStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        console.log(`Ccache statistics read from ${statsFile}`);

        const result = await sendData(ccacheStats, endpointArgs);
        if (!result) {
            throw new Error('Failed to send ccache statistics.');
        }
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
