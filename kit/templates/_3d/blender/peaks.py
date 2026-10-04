# A minimal 3D ink-wash scene: ranges of hills standing in a sea of cloud at three distances, a bluff in front with the
# character on it, a sun far behind. Copy the folder this file is in to videos/<film>/blender/ and, from the project folder:
#   python tools/shot3d.py <film> peaks still          → videos/<film>/out/shots/peaks.png   (look at this first)
#   python tools/shot3d.py <film> peaks layers         → videos/<film>/img/peaks/*.webp + layers.js   (the page side: ../scene.js)
# flyover.py, next to this file, flies a camera over the same set. How it all works: the skill's references/3d.md.
# Distances are in scene units; the character is about 2.6 tall. +Y is away from the camera, +X to the right, +Z up.
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'lib3d'))      # <project>/lib3d, seen from videos/<film>/blender/
from inkkit import *  # noqa: E402,F401,F403

CAM_AT, CAM_AIM = (0.0, -34.0, 8.5), (-6.0, 60.0, 5.0)
BLUFF_AT, BLUFF_TOP, BLUFF_FOOT = (9.0, -6.0), 4.0, -9.0
SUN_AT, SUN_R = (-70.0, 900.0, 22.0), 75.0


def bluff(x, y):
    """the rock the character stands on: level inside its rim, then a drop in ledges, down to a foot that the mist hides"""
    d = math.hypot((x - BLUFF_AT[0]) / 8.0, (y - BLUFF_AT[1]) / 4.5) + 0.14 * noise.noise(Vector((x * 0.25, y * 0.25, 4.0)))
    if d <= 1.0:
        return BLUFF_TOP + 0.1 * noise.noise(Vector((x * 0.7, y * 0.7, 1.0)))
    rough = noise.ridged_multi_fractal(Vector((x * 0.6, y * 0.6, 2.0)), 1.0, 2.0, 4, 1.0, 2.0)
    fall = 18.0 * (1 - math.exp(-(d - 1.0) * (2.2 + 0.6 * rough)))
    return max(BLUFF_FOOT, BLUFF_TOP - strata(fall, 2.2))


# ── ink: one material per distance. Nearer = more ink, coarser streaks; farther = paler, bluer. wash = thin colour over the ink.
M_NEAR = ink('near', base=0.4, shade=0.42, crevice=0.5, top=0.0, edge=0.2, streak=0.32, blot=0.18, streak_scale=(0.9, 0.9, 0.14), blot_scale=0.2, ao=1.6,
             far=(60.0, 200.0), far_k=1.0, crack=((0.8, 0.8, 0.18), 0.035, 0.26), wash=[(OCHRE, 0.8, 'sun'), (AZURITE, 0.4, 'shade')], wash_scale=0.12)
M_MID = ink('mid', base=0.3, shade=0.5, crevice=0.42, top=0.34, edge=0.26, streak=0.26, blot=0.12, streak_scale=(0.4, 0.4, 0.06), blot_scale=0.08, ao=5.0,
            far=(55.0, 190.0), far_k=0.72, crack=((0.45, 0.45, 0.09), 0.035, 0.3), wash=[(MALACHITE, 0.95, 'top'), (OCHRE, 0.85, 'low')], wash_scale=0.05)
M_FAR = ink('far', base=0.24, shade=0.46, crevice=0.3, top=0.3, edge=0.2, streak=0.2, blot=0.1, streak_scale=(0.11, 0.11, 0.02), blot_scale=0.03, ao=14.0,
            far=(170.0, 360.0), far_k=0.62, wash=[(AZURITE, 1.0, 'top'), (MALACHITE, 0.75, 'low')], wash_scale=0.012)
M_BACK = ink('back', base=0.2, shade=0.2, crevice=0.0, top=0.12, edge=0.1, streak=0.06, blot=0.05, streak_scale=(0.03, 0.03, 0.008), blot_scale=0.006,
             far=(200.0, 600.0), far_k=0.7, wash=[(INDIGO, 0.95, 'all')], wash_scale=0.004)

# ── the set, nearest first. A mountain is [(x, y, height, radius), …] on a base that lies under the mist.
grid_mesh('bluff', BLUFF_AT[0] - 26, BLUFF_AT[0] + 26, BLUFF_AT[1] - 15, BLUFF_AT[1] + 15, 300, 180, bluff, M_NEAR, floor=BLUFF_FOOT)
mountain('mid_a', [(-30, 46, 22, 11), (-39, 54, 16, 8), (-22, 56, 14, 7)], -9, 3.0, M_MID, n=220, pw=0.82, flutes=9)
mountain('mid_b', [(-58, 84, 24, 13), (-72, 94, 17, 9)], -9, 6.5, M_MID, n=200, pw=0.82, flutes=9)
mountain('mid_c', [(40, 96, 21, 12), (53, 106, 15, 8)], -9, 9.0, M_MID, n=200, pw=0.82, flutes=9)
mountain('far_a', [(-110, 210, 62, 40), (-150, 196, 46, 32), (-84, 232, 44, 28)], -12, 12.5, M_FAR, n=240)
mountain('far_b', [(96, 226, 54, 36), (136, 244, 40, 30)], -12, 16.0, M_FAR, n=220)
mountain('back_a', [(-240, 560, 64, 80), (-130, 600, 46, 64)], -8, 21.0, M_BACK, n=120, crag=0.2)
mountain('back_b', [(170, 580, 72, 84), (290, 540, 50, 64)], -8, 24.5, M_BACK, n=120, crag=0.2)
mist(location=(0.0, 280.0, 2.0), scale=(1400.0, 900.0, 30.0))   # the sea of cloud: a box of mist, everything below about z = 1 is paper
for at, half in [((-4, 34, 1.4), (24, 8, 3.0)), ((30, 70, 2.6), (30, 12, 3.6)), ((-70, 118, 4.5), (56, 14, 5.0)), ((60, 180, 6.0), (60, 20, 5.5))]:
    cloud(at, half)                                       # banks of cloud standing up out of it (centre, half-sizes)
sunlight(elevation=30, azimuth=-58)

# ── what the page will hang things on, and who acts
anchor('sun', SUN_AT, size=SUN_R)                         # layers.js gets its place in the frame, its distance and its radius in pixels
# In a still or a flight the sun is in the picture; in layers the page draws it, so that it can move. Any key=value given to
# tools/shot3d.py lands in OPT: `still sun=0` renders the still without it, which is the picture the stacked layers must match.
if MODE != 'layers' and OPT.get('sun', '1') == '1':
    disc('sun', SUN_R, flat('sun', RED), SUN_AT)
buddy((BLUFF_AT[0] - 3.0, BLUFF_AT[1] - 1.5, BLUFF_TOP + 0.05), facing=-28)    # actors `buddy` and `buddy-arm`, anchor `buddy-feet`

# ── the camera. over = how much wider and taller than the frame the layers are drawn: the room the page has to move in.
camera(CAM_AT, CAM_AIM, over=(1.4, 1.25))
if __name__ == '__main__':      # run by Blender itself. flyover.py imports this file for its set and camera, and ends in fly() instead
    # slabs by distance from the camera, nearest first. Every cut falls in a gap: no hill and no bank of cloud lies across one
    # (the bluff ends about 43 from the camera, the first bank starts at 60; the last bank of the middle ends at 166, the far hills start at 196).
    finish([('near', 0.1, 50.0), ('mid', 50.0, 172.0), ('far', 172.0, 420.0), ('back', 420.0, 3000.0)])
