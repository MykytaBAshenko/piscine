#include "rush.h"

static int	group_value(char *nb, int len, int g)
{
	int	start;
	int	end;
	int	v;

	end = len - 3 * g;
	start = end - 3;
	if (start < 0)
		start = 0;
	v = 0;
	while (start < end)
	{
		v = v * 10 + (nb[start] - '0');
		start++;
	}
	return (v);
}

static void	print_words(char **w, int n)
{
	int	i;

	i = 0;
	while (i < n)
	{
		if (i)
			ft_putstr(" ");
		ft_putstr(w[i]);
		i++;
	}
	ft_putstr("\n");
}

static int	convert_groups(t_dict *d, char *nb, char **w, int *n)
{
	int	len;
	int	g;
	int	v;

	len = ft_strlen(nb);
	g = (len + 2) / 3 - 1;
	while (g >= 0)
	{
		v = group_value(nb, len, g);
		if (v && add_group(d, v, w, n) < 0)
			return (-1);
		if (v && g > 0 && add_scale(d, g, w, n) < 0)
			return (-1);
		g--;
	}
	return (0);
}

int	convert(t_dict *d, char *nb)
{
	char	**w;
	int		n;
	int		len;
	int		ret;

	len = ft_strlen(nb);
	w = malloc(sizeof(char *) * ((len / 3 + 1) * 5 + 2));
	if (!w)
		return (-1);
	n = 0;
	if (len == 1 && nb[0] == '0')
		ret = add_word(d, "0", w, &n);
	else
		ret = convert_groups(d, nb, w, &n);
	if (ret == 0)
		print_words(w, n);
	free(w);
	return (ret);
}
