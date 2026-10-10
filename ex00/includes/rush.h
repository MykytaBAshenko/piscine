#ifndef RUSH_H
# define RUSH_H

# include <unistd.h>
# include <stdlib.h>
# include <fcntl.h>

typedef struct s_entry
{
	char	*key;
	char	*value;
}	t_entry;

typedef struct s_dict
{
	t_entry	*entries;
	int		count;
}	t_dict;

int		ft_strlen(char *s);
int		ft_strcmp(char *a, char *b);
void	ft_putstr(char *s);
char	*ft_substr(char *s, int len);

char	*read_file(char *path);
int		parse_line(char *s, int len, t_entry *e);
int		parse_dict(char *path, t_dict *d);
void	free_dict(t_dict *d);
char	*lookup(t_dict *d, char *key);

int		add_word(t_dict *d, char *key, char **w, int *n);
int		add_scale(t_dict *d, int g, char **w, int *n);
int		add_group(t_dict *d, int v, char **w, int *n);
int		convert(t_dict *d, char *nb);

#endif
