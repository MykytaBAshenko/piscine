#include <stdlib.h>

char	*ft_strdup(char *src)
{
	char	*dest;
	int		i;
	int		lenght;

	lenght = 0;
	while (src[lenght])
		lenght++;

	dest = (char *)malloc(sizeof(char) * (lenght + 1));

	if (dest == NULL)
		return (NULL);
	i = 0;

	while (i < lenght)
	{
		dest[i] = src[i];
		i++;
	}
	dest[i] = '\0';
	return (dest);
}
