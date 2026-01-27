# NetOps Tower - Issues Tracker

## Resolved Issues

### 1. Player sitting position (straddling chair)
**Status:** FIXED
- Fixed the seated leg rotation in Character.tsx
- Changed thigh rotation from positive to negative (`-Math.PI / 2.4`) to make legs extend forward
- Adjusted leg geometry and positioning for proper seated pose

### 2. Computer interaction button not showing
**Status:** FIXED
- Updated ComputerInteraction component to show when:
  - Player is seated at desk
  - Player is standing near the desk (within DESK_ZONE)
- Made button larger and more visible with:
  - Floating animation
  - Glowing effect
  - Pulsing emissive material
  - Clear label with icon
- Added F key shortcut for quick computer access

### 3. Office needs more decor
**Status:** FIXED
- Added decorations:
  - Printer with stand
  - Filing cabinet
  - Floor plants (2 locations)
  - Coat rack with jacket
  - Wall art
  - Water cooler (corner)
  - Trash bin (near desk)
  - Desk lamp
- Could still add in future:
  - More wall decorations
  - Ceiling details/lighting

### 4. Movement controls hint should update
**Status:** FIXED
- HUD now shows F key hint when:
  - Player is seated at desk in basement
  - Player is standing near desk in basement (within DESK_ZONE)
- F key hint has pulsing animation to draw attention

---

## Open Issues

### 5. Consider adding more floor decorations
- Additional decorative items to make office feel lived-in
- Maybe personal items on desk
- Photos/awards on wall

---

## Notes
- Character model faces +Z by default
- Rotation Math.PI makes character face -Z (toward monitors)
- Seated position puts character at chair location facing desk
