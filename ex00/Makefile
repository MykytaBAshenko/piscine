NAME	= rush-02

SRC_DIR	= src
INC_DIR	= includes
OBJ_DIR	= obj

SRCS	= main.c utils.c dict.c read_file.c parse_line.c \
		  convert.c convert_words.c
OBJS	= $(addprefix $(OBJ_DIR)/, $(SRCS:.c=.o))
HEADERS	= $(INC_DIR)/rush.h

CC		= cc
CFLAGS	= -Wall -Wextra -Werror -I$(INC_DIR)

all: $(NAME)

$(NAME): $(OBJS)
	$(CC) $(CFLAGS) -o $(NAME) $(OBJS)

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c $(HEADERS)
	@mkdir -p $(OBJ_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -rf $(OBJ_DIR)

fclean: clean
	rm -f $(NAME)

re: fclean all

.PHONY: all clean fclean re
