#include <ctype.h>
#include <stdio.h>
#include <string.h>

static int is_blank_line(const char *line) {
    while (*line != '\0') {
        if (!isspace((unsigned char)*line)) {
            return 0;
        }
        line++;
    }
    return 1;
}

static void trim_right(char *line) {
    size_t length = strlen(line);
    while (length > 0 && isspace((unsigned char)line[length - 1])) {
        line[length - 1] = '\0';
        length--;
    }
}

static int count_words(const char *line) {
    int in_word = 0;
    int total = 0;

    while (*line != '\0') {
        if (isspace((unsigned char)*line)) {
            in_word = 0;
        } else if (!in_word) {
            in_word = 1;
            total++;
        }
        line++;
    }

    return total;
}

static void print_summary(const char *line) {
    printf("line: %s\n", line);
    printf("words: %d\n", count_words(line));
}

int main(void) {
    char line[256] = "  CustomViewer sample function browser  ";

    trim_right(line);
    if (!is_blank_line(line)) {
        print_summary(line);
    }

    return 0;
}