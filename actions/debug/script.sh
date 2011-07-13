# Just a sample action that lets me test and debug some aspects
id
echo "[1;32;40m[1m[ok][0m"
echo "[31;40m[1m[error][0m"
# Show all the colors of the rainbow, should be run under bash
#for STYLE in 0 1 2 3 4 5 6 7; do
  #for FG in 30 31 32 33 34 35 36 37; do
    #for BG in 40 41 42 43 44 45 46 47; do
      #CTRL="\033[${STYLE};${FG};${BG}m"
      ##echo -e "${CTRL}"
      #echo "${STYLE};${FG};${BG}"
      ##echo -e "\033[0m"
    #done
    #echo
  #done
  #echo
#done
# Reset
#echo -e "\033[0m"

echo "I am going to sleep for a while now"
sleep 30
echo "YAWN. still sleepy. See you in a bit"
sleep 20
echo "Aww man, already? ok.."

