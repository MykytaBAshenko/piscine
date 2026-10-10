#include "rush.h"

static void	num_key(char *k, int v)
{
	if (v >= 10)
	{
		k[0] = '0' + v / 10;
		k[1] = '0' + v % 10;
		k[2] = '\0';
	}
	else
	{
		k[0] = '0' + v;
		k[1] = '\0';
	}
}

static int	add_small(t_dict *d, int v, char **w, int *n)
{
	char	k[3];

	if (v >= 20)
	{
		num_key(k, v / 10 * 10);
		if (add_word(d, k, w, n) < 0)
			return (-1);
		v %= 10;
	}
	if (v == 0)
		return (0);
	num_key(k, v);
	return (add_word(d, k, w, n));
}

int	add_word(t_dict *d, char *key, char **w, int *n)
{
	char	*v;

	v = lookup(d, key);
	if (!v)
		return (-1);
	w[*n] = v;
	(*n)++;
	return (0);
}

int	add_scale(t_dict *d, int g, char **w, int *n)
{
	char	*key;
	int		i;
	int		ret;

	key = malloc(3 * g + 2);
	if (!key)
		return (-1);
	key[0] = '1';
	i = 1;
	while (i <= 3 * g)
	{
		key[i] = '0';
		i++;
	}
	key[i] = '\0';
	ret = add_word(d, key, w, n);
	free(key);
	return (ret);
}

int	add_group(t_dict *d, int v, char **w, int *n)
{
	char	k[3];

	if (v >= 100)
	{
		num_key(k, v / 100);
		if (add_word(d, k, w, n) < 0 || add_word(d, "100", w, n) < 0)
			return (-1);
	}
	return (add_small(d, v % 100, w, n));
}
