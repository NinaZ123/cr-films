sheet () {
	out=$1 
	shift
	args=() 
	fl="" 
	n=0 
	for v in "$@"
	do
		for t in 0.1 2.5 4.9
		do
			args+=(-ss $t -i $v) 
			fl+="[$n]scale=560:238,setsar=1[v$n];" 
			n=$((n+1)) 
		done
	done
	rows=$(( n/3 )) 
	st="" 
	for r in $(seq 0 $((rows-1)))
	do
		st+="[v$((r*3))][v$((r*3+1))][v$((r*3+2))]hstack=3[r$r];" 
	done
	vs="" 
	for r in $(seq 0 $((rows-1)))
	do
		vs+="[r$r]" 
	done
	ffmpeg -v error -y "${args[@]}" -filter_complex "$fl$st${vs}vstack=$rows" -frames:v 1 $out
}
