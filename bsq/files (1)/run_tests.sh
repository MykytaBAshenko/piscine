#!/bin/sh
# usage: ./run_tests.sh /path/to/bsq
BSQ=${1:-../bsq/bsq}
for f in valid_* invalid_*; do
	printf "== %s: " "$f"
	if [ "$(wc -c < $f)" -gt 3000 ]; then
		$BSQ "$f" | head -c 11 | tr '\n' ' '; echo "..."
	else
		echo; $BSQ "$f"
	fi
done
echo "== multiple files"; $BSQ valid_example invalid_same_chars valid_single_cell
echo "== stdin"; $BSQ < valid_example | head -3
