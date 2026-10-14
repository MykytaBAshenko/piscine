#include <stdlib.h>

int	*ft_range(int min, int max)
{
	int	*array;
	int	i;

	i = 0;

	// The array pointer receives the memory allocated to the size of the range between Max and Min
	array = (int *) malloc(sizeof(int) * ((max - min) + 1));

	// If min is greater than max, array gets null and the returns is 0
	if (min >= max)
	{
		array = NULL;
		return (0);
	}

	// While the min is smaller than max, array receives the min
	while (min < max)
	{
		array[i] = min;
		i++;
		min++;
	}
	// The return is the array
	return (array);
}