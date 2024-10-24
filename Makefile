CC=ccache g++
CFLAGS=-Wall
TARGET=main
SRC_DIR=cppsrc

all: $(TARGET)

$(TARGET): $(SRC_DIR)/main.cpp
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC_DIR)/main.cpp

clean:
	rm -f $(TARGET)
	ccache -C
