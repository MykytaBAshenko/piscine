#include "rush.h"

static int	skip_sp(char *s, int i, int len)
{
	while (i < len && s[i] == ' ')
		i++;
	return (i);
}

static int	skip_digits(char *s, int i, int len)
{
	while (i < len && s[i] >= '0' && s[i] <= '9')
		i++;
	return (i);
}

static int	check_value(char *s, int vs, int ve)
{
	if (ve == vs)
		return (-1);
	while (vs < ve)
	{
		if (s[vs] < 32 || s[vs] > 126)
			return (-1);
		vs++;
	}
	return (0);
}

static int	make_entry(char *s, int *k, int *v, t_entry *e)
{
	while (k[0] < k[1] - 1 && s[k[0]] == '0')
		k[0]++;
	e->key = ft_substr(s + k[0], k[1] - k[0]);
	e->value = ft_substr(s + v[0], v[1] - v[0]);
	if (!e->key || !e->value)
	{
		free(e->key);
		free(e->value);
		return (-1);
	}
	return (0);
}

/* returns 0 = entry parsed, 1 = empty line, -1 = error */
int	parse_line(char *s, int len, t_entry *e)
{
	int	i;
	int	k[2];
	int	v[2];

	i = skip_sp(s, 0, len);
	if (i == len)
		return (1);
	k[0] = i;
	i = skip_digits(s, i, len);
	k[1] = i;
	i = skip_sp(s, i, len);
	if (k[0] == k[1] || i == len || s[i] != ':')
		return (-1);
	v[0] = skip_sp(s, i + 1, len);
	v[1] = len;
	while (v[1] > v[0] && s[v[1] - 1] == ' ')
		v[1]--;
	if (check_value(s, v[0], v[1]) < 0)
		return (-1);
	return (make_entry(s, k, v, e));
}
