# A flight over the set of peaks.py: the one kind of shot layers cannot do, because the camera travels through the scene.
# It is rendered frame by frame, so keep it short, and let it end exactly where the camera of the layered scene stands:
# the page can then hand over from the last frame to the layers without a visible seam.
#   python tools/shot3d.py <film> flyover fly step=15 samples=32   → a few frames → python tools/sheet3d.py <film> flyover
#   python tools/shot3d.py <film> flyover fly samples=32           → every frame → python tools/pack_frames.py <film> flyover
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from peaks import *  # noqa: E402,F401,F403  — builds the set and the camera; renders nothing (see its last lines)

START, SECONDS = (30.0, -150.0, 16.0), 3.0


def pose(t):
    """the camera t seconds into the flight → (where it is, what it looks at, roll in degrees)"""
    k = 1 - (1 - min(1.0, t / SECONDS)) ** 3              # fast at first, easing to a stop
    return tuple(Vector(START).lerp(Vector(CAM_AT), k)), CAM_AIM, 4.0 * (1 - k)


fly(pose, SECONDS)
