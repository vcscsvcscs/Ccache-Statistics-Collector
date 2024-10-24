const fs = require('fs');
const tl = require('azure-pipelines-task-lib/task');
const path = require('path');

async function run() {
    try {
        const ccacheLogFile = tl.getPathInput('ccacheLogFile', true, true);
        const tempDir = tl.getVariable('Agent.TempDirectory');
        const statsFile = path.join(tempDir, 'ccache_stats.json');

        // Read the ccache log file
        const ccacheLog = fs.readFileSync(ccacheLogFile, 'utf8');
        const lines = ccacheLog.split('\n');
        console.log('Ccache log file read successfully.');

        // Parse the log for statistics
        const ccacheStats = getCcacheStatisticFromLog(lines);

        if (Object.keys(ccacheStats).length === 0) {
            console.log('No ccache statistics found in the log.');
            tl.setResult(tl.TaskResult.Failed, 'No ccache statistics found.');
            return;
        }

        
        let os;
        try {
            os = tl.getPlatform();
        } catch {
            os = 'Unknown';
        }

        // Get Azure DevOps environment variables for build information
        const buildInfo = {
            ccache_version: ccacheStats.build_info.ccache_version,
            agent_name: tl.getVariable('Agent.Name'),
            build_name: tl.getVariable('Build.DefinitionName'),
            build_number: tl.getVariable('Build.BuildNumber'),
            stage_name: tl.getVariable('System.StageName'),
            platform: os
        };

        ccacheStats.build_info = buildInfo;

        // Write statistics to a file
        fs.writeFileSync(statsFile, JSON.stringify(ccacheStats));
        console.log(`Ccache statistics written to ${statsFile}`);

        // Set output variable for the next task
        tl.setVariable('ccacheStatsFile', statsFile);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

function getCcacheStatisticFromLog(fileLines) {
    let version = '';
    let versionMajor = 0;
    let versionMinor = 0;
    const config = {};
    const stats = {};
    const results = {};

    fileLines.forEach(line => {
        const configRecord = line.match(/\s+\d+\s*]\s+Config:\s+\(\S*\)\s+(\S+)\s*=\s*(.*)\s*$/);
        if (configRecord) {
            config[configRecord[1]] = configRecord[2];
        }

        const resultRecord = line.match(/\s+\d+\s*]\s+Result:\s+(.*)\s*$/);
        if (resultRecord) {
            const key = resultRecord[1];
            results[key] = (results[key] || 0) + 1;
        }

        const versionRecord = line.match(/\s+\d+\s*]\s+=+ CCACHE v?((\d+)\.(\d+)(\..+)*) STARTED =+\s*$/);
        if (versionRecord) {
            version = versionRecord[1];
            versionMajor = parseInt(versionRecord[2], 10);
            versionMinor = parseInt(versionRecord[3], 10);
        }
    });

    if (Object.keys(results).length === 0) {
        return {};  // Return empty if no results
    }

    // Handling for versions starting from 4.4, where cache hits are named differently
    if (versionMajor > 4 || (versionMajor === 4 && versionMinor >= 4)) {
        stats['ccache_hit'] = (results['direct_cache_hit'] || 0) + (results['preprocessed_cache_hit'] || 0);
        stats['ccache_miss'] = results['cache_miss'] || 0;
    } else {
        stats['ccache_hit'] = (results['cache hit (direct)'] || 0) + (results['cache hit (preprocessed)'] || 0);
        stats['ccache_miss'] = results['cache miss'] || 0;
    }

    stats['ccache_calls'] = stats['ccache_miss'] + stats['ccache_hit'];
    stats['hit_rate'] = stats['ccache_calls'] > 0 ? (100 * stats['ccache_hit'] / stats['ccache_calls']).toFixed(2) : 0;

    return {
        build_info: {
            ccache_version: version,
        },
        ccache_config: config,
        ccache_stats: stats,
    };
}

run();
