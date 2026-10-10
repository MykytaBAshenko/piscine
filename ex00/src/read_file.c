#include "rush.h"

static char	*grow_buf(char *buf, int len, int cap)
{
	char	*tmp;
	int		i;

	tmp = malloc(cap + 1);
	if (tmp)
	{
		i = 0;
		while (i < len)
		{
			tmp[i] = buf[i];
			i++;
		}
	}
	free(buf);
	return (tmp);
}

static char	*read_loop(int fd, char *buf, int cap)
{
	int	len;
	int	r;

	len = 0;
	r = 0;
	while (buf)
	{
		r = read(fd, buf + len, cap - len);
		if (r <= 0)
			break ;
		len += r;
		if (len == cap)
		{
			cap *= 2;
			buf = grow_buf(buf, len, cap);
		}
	}
	if (buf && r < 0)
	{
		free(buf);
		buf = NULL;
	}
	if (buf)
		buf[len] = '\0';
	return (buf);
}

char	*read_file(char *path)
{
	char	*buf;
	int		fd;

	fd = open(path, O_RDONLY);
	if (fd < 0)
		return (NULL);
	buf = read_loop(fd, malloc(1025), 1024);
	close(fd);
	return (buf);
}
