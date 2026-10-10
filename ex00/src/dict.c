#include "rush.h"

static int	count_lines(char *buf)
{
	int	i;
	int	lines;

	i = 0;
	lines = 1;
	while (buf[i])
	{
		if (buf[i] == '\n')
			lines++;
		i++;
	}
	return (lines);
}

static int	fill_dict(char *buf, t_dict *d)
{
	int	i;
	int	start;
	int	res;

	i = 0;
	while (1)
	{
		start = i;
		while (buf[i] && buf[i] != '\n')
			i++;
		res = parse_line(buf + start, i - start, &d->entries[d->count]);
		if (res < 0)
			return (-1);
		if (res == 0)
			d->count++;
		if (!buf[i])
			return (0);
		i++;
	}
}

void	free_dict(t_dict *d)
{
	int	i;

	i = 0;
	while (i < d->count)
	{
		free(d->entries[i].key);
		free(d->entries[i].value);
		i++;
	}
	free(d->entries);
	d->entries = NULL;
	d->count = 0;
}

int	parse_dict(char *path, t_dict *d)
{
	char	*buf;

	d->entries = NULL;
	d->count = 0;
	buf = read_file(path);
	if (!buf)
		return (-1);
	d->entries = malloc(sizeof(t_entry) * count_lines(buf));
	if (!d->entries || fill_dict(buf, d) < 0)
	{
		free(buf);
		free_dict(d);
		return (-1);
	}
	free(buf);
	return (0);
}

char	*lookup(t_dict *d, char *key)
{
	int	i;

	i = 0;
	while (i < d->count)
	{
		if (ft_strcmp(d->entries[i].key, key) == 0)
			return (d->entries[i].value);
		i++;
	}
	return (NULL);
}
