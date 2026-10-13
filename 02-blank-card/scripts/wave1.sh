#!/usr/bin/env bash
# 第一批参考单图：Seven 10 张、职员 2 张、执法者 2 张、场景 5 张、道具 4 张
cd "$(dirname "$0")/.."
S7=assets/sheets/seven-sheet-v2-0.png
ENF=assets/sheets/enf-sheet-v1-0.png
CLK=assets/sheets/clerk-sheet-v2-0.png
HALL2=test/t2/hall2-0.png
O=assets; L=work/logs/wave1.log
STY="Same art style as the reference: flat 2D cel-shaded 1980s OVA anime, clean ink linework, subtle halftone and film grain."
BG="plain warm off-white background with subtle halftone. Only ONE figure, no panels, no text."
SEV="This is the same girl 'Seven' from the reference sheet: same face, silver-grey eyes, black asymmetric bob with straight bangs, ONE orange hair streak on the right side of her face; cream retro headphones with an orange stripe; a SHORT black coiled cord from the left ear cup tucked into her collar (no long cord, no braid hanging down); oversized olive-green MA-1 jacket with orange lining at collar and cuffs, exactly ONE round orange-ringed '07' patch on her LEFT upper sleeve only (the right sleeve has NO patch), a small silver safety pin on her LEFT chest; black turtleneck, dark grey shorts with black belt, black tights, chunky white sneakers."
SEVB="${SEV/cream retro headphones with an orange stripe; a SHORT black coiled cord from the left ear cup tucked into her collar (no long cord, no braid hanging down);/NO headphones at all (nothing on her head or around her neck), her bob hair falls naturally;}"
img(){ local n=$1 sz=$2; shift 2; bin/cr-image --model gpt-image-2.5-flare --size $sz --out $O --name $n "$@" >> $L 2>&1; }
F=1024x1536; W=1536x1024
# Seven
img seven-a1-front $F --image $S7 --prompt "$STY $SEV Full body, head to toe, facing the viewer straight on, standing relaxed, hands in jacket pockets. $BG" &
img seven-a2-back $F --image $S7 --prompt "$STY $SEV Full body, head to toe, seen from directly BEHIND, standing straight. From behind we see the back of the bob, the headphone band over the top of her head, the 07 patch on her left sleeve (which is on the viewer's LEFT side when seen from behind). $BG" &
img seven-a3-skate $F --image $S7 --prompt "$STY $SEV Full body side view (her left side facing the viewer), riding a black skateboard with orange wheels, knees bent, leaning forward, moving to the right of frame, jacket flaring back. $BG" &
img seven-a4-half $W --image $S7 --prompt "$STY $SEV Waist-up, three-quarter view facing slightly to the viewer's left, calm neutral expression, hands relaxed. $BG" &
img seven-a5-calm $W --image $S7 --prompt "$STY $SEV Close-up head and shoulders, three-quarter view, calm, cool, composed neutral expression, eyes open looking ahead. $BG" &
img seven-a6-music $W --image $S7 --prompt "$STY $SEV Close-up head and shoulders, three-quarter view, eyes half-closed, head tilted slightly, quietly enjoying music in her headphones, faint relaxed contentment, no broad smile. $BG" &
img seven-a7-surprise $W --image $S7 --prompt "$STY $SEV Close-up head and shoulders, looking down at something in her hands, eyes widened slightly in quiet surprise, lips slightly parted, restrained, not cartoonish. $BG" &
img seven-a8-smile $W --image $S7 --prompt "$STY $SEV Close-up head and shoulders, three-quarter view, face lit by soft light, a small faint genuine smile at one corner of her mouth, calm eyes. Subtle, not cute, not grinning. $BG" &
img seven-b1-half $W --image $S7 --prompt "$STY $SEVB Waist-up, three-quarter view facing slightly to the viewer's left, calm neutral expression. $BG" &
img seven-b2-back $F --image $S7 --prompt "$STY $SEVB Full body, head to toe, seen from directly BEHIND, standing straight, the 07 patch on her left sleeve (viewer's LEFT when seen from behind). $BG" &
# 职员
CL="This is the same 'Clerk' office android from the reference sheet: short round matte beige-cream body, round head with a flat blank pale face plate with no features, round ear discs, olive-green vest and olive puffy sleeve covers."
img clerk-1-front $F --image $CLK --prompt "$STY $CL Full body, head to toe, front view, standing. $BG" &
img clerk-2-desk $W --image $CLK --prompt "$STY $CL Three-quarter view, sitting at a beige metal office desk, pressing a rubber stamp onto a cream punch card. Plain warm off-white background, only one figure, no text." &
# 执法者
EN="This is the same 'Enforcer' android from the reference sheet: tall slender elegant porcelain-white ceramic body, thin black seam lines at the joints, long white armor coat-tail panels from waist to knees, white heeled armored boots, smooth white helmet with round ear discs and one glossy pure-black visor covering the face, no features."
img enf-a1-front $F --image $ENF --prompt "$STY $EN Full body, head to toe, front view, standing straight and still, arms at sides, the visor completely black with no light. $BG" &
img enf-a2-visor $W --image $ENF --prompt "$STY $EN Close-up of the head and shoulders, three-quarter view, the visor completely black and glossy with a soft highlight, no light, no display. $BG" &
# 场景
SC="Use the reference only for the art style; flat 2D cel-shaded 1980s OVA anime background art, clean ink linework, subtle halftone, film grain. No people, no readable text, no logos."
img hall-1-wide $W --image $HALL2 --prompt "$SC Same location as the reference (same beige desks, beige CRT monitors glowing amber, olive filing cabinets, brass pneumatic tubes, orange floor lines, amber light), but seen from a very high overhead angle: an enormous endless hall, thousands of identical desks in a grid receding to a vanishing point, archive shelves like canyon walls, tiny tiny scale." &
img hall-3-sort $W --image $HALL2 --prompt "$SC Same location as the reference (same beige desks, CRTs, olive cabinets, brass tubes, amber light), closer view of one sorting station: a beige desk with sorting trays of cream punch cards, and a brass pneumatic tube coming down from the ceiling ending in a round receiving hatch with a small tray, transparent glass tube sections. Medium close shot, background softly out of focus." &
img hall-4-crt $W --image $HALL2 --prompt "$SC Same location as the reference (same beige CRT monitors, olive cabinets, amber light), a huge wall made of hundreds of the same beige CRT monitors stacked in a grid, all screens glowing amber with abstract scan lines and no readable text, brass tubes above." &
img white-1-door $W --image $S7 --prompt "$SC Use the reference only for the art style, do not draw the girl. A vast empty pure white space with a faint cool grey horizon and soft floor reflection, in the center a tall rectangular door made entirely of glowing white and pale cyan floating particles and dots, quiet and sacred, wide frontal shot." &
img roof-1-sunrise $W --image $S7 --prompt "$SC Use the reference only for the art style, do not draw the girl. The edge of the flat rooftop of an enormous monolithic retro-futurist building above a sea of clouds, seen from behind toward the horizon, the sun rising, real open sky in warm gold and peach with blue above, wind. Wide shot, leave room for a figure standing at the edge." &
# 道具
PR="Same art style as the reference: flat 2D cel-shaded 1980s OVA anime, clean ink linework. Prop design, single object centered on a plain warm off-white background, no text, no logos."
img prop-card-blank $W --image $S7 --prompt "$PR A single cream-white rectangular IBM-style punch card with one cut corner, completely blank: NO holes at all, no printing, faintly glowing pale. Slight three-quarter angle." &
img prop-capsule $W --image $HALL2 --prompt "$PR A pneumatic tube capsule: a transparent glass cylinder with brass metal end caps and a twist-lock band, as used in the brass tubes of the reference image. Side view." &
img prop-headphones $W --image $S7 --prompt "$PR Exactly the girl's headphones from the reference sheet, alone: chunky retro over-ear headphones, cream white with a vertical orange stripe on each ear cup, a short black coiled cord. Three-quarter view." &
img prop-skateboard $W --image test/t2/s04-0.png --prompt "$PR Exactly the skateboard from the reference image, alone: black deck, orange wheels. Three-quarter view from above." &
wait
