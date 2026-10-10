#include "rush.h"

int	ft_strlen(char *s)
{
	int	i;

	i = 0;
	while (s[i])
		i++;
	return (i);
}

int	ft_strcmp(char *a, char *b)
{
	int	i;

	i = 0;
	while (a[i] && a[i] == b[i])
		i++;
	return ((unsigned char)a[i] - (unsigned char)b[i]);
}

void	ft_putstr(char *s)
{
	write(1, s, ft_strlen(s));
}

char	*ft_substr(char *s, int len)
{
	char	*r;
	int		i;

	r = malloc(len + 1);
	if (!r)
		return (NULL);
	i = 0;
	while (i < len)
	{
		r[i] = s[i];
		i++;
	}
	r[i] = '\0';
	return (r);
}
