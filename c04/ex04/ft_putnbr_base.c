#include <unistd.h>

int ft_check_base(char *b)
{
    int i;
    int j;

    i = 0;
    while (b[i])
    {
        if (b[i] == '+' || b[i] == '-' || b[i] <= 32 || b[i] > 126)
            return (0);
        j = i + 1;
        while (b[j])
            if (b[i] == b[j++])
                return (0);
        i++;
    }

    if (i < 2)
        return (0);
    return i;
}

void ft_put_rec(long n, char *base, int size)
{
    if (n >= size)
        ft_put_rec(n/size, base, size);
    write(1,&base[n%size],1);
}

void ft_putnbr_base(int nbr, char *base)
{
    long    n;
    int     size;

    size = ft_check_base(base);
    if (!size)
        return;
    n = nbr;
    if (n < 0)
    {
        write(1,"-",1);
        n = -n;
    }
    ft_put_rec(n,base,size);
}
