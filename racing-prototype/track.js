// TRACK LOGIC layer - the authoritative path (a sequence of straight/corner segments, in native pre-scale units)
// that determines where the car starts, how the camera reasons about the circuit, and where the invisible
// collision geometry sits. This layer NEVER changes when the visual representation is swapped out; that is the
// entire point of splitting it out. All the geometry here was measured directly off the current tile .glb files
// (see the corner-exit vertex probe used to derive cornerExit) - a replacement circuit that keeps this same
// layout will keep working with the existing car-start/camera/collision code untouched.
const TRACK_LAYOUT_CONFIG = {
  straightLen: 2.65, // roadStraightLong.glb footprint depth, native kit units (pre KIT_SCALE)
  cornerExit: { x: -1.65, z: -2.15 }, // roadCornerLarge.glb measured exit-face centre, native kit units
  cornerTurn: Math.PI / 2,
  longSideTiles: 6,
  shortSideTiles: 2,
};

function buildTrackLayout(config = TRACK_LAYOUT_CONFIG) {
  const cursor = { pos: BABYLON.Vector3.Zero(), rot: 0 };
  const startCursor = { pos: cursor.pos.clone(), rot: cursor.rot };
  const segments = [];

  function advanceStraight(len = config.straightLen) {
    const dir = new BABYLON.Vector3(Math.sin(cursor.rot), 0, Math.cos(cursor.rot));
    cursor.pos.addInPlace(dir.scale(-len));
  }
  function advanceCorner() {
    const exit = new BABYLON.Vector3(config.cornerExit.x, 0, config.cornerExit.z);
    const world = BABYLON.Vector3.TransformCoordinates(exit, BABYLON.Matrix.RotationY(cursor.rot));
    cursor.pos.addInPlace(world);
    cursor.rot += config.cornerTurn;
  }

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < config.longSideTiles; i++) {
      segments.push({ type: 'straight', part: 'long', index: i, pos: cursor.pos.clone(), rot: cursor.rot });
      advanceStraight();
    }
    segments.push({ type: 'corner', part: 'long-corner', pos: cursor.pos.clone(), rot: cursor.rot });
    advanceCorner();
    for (let i = 0; i < config.shortSideTiles; i++) {
      segments.push({ type: 'straight', part: 'short', index: i, pos: cursor.pos.clone(), rot: cursor.rot });
      advanceStraight();
    }
    segments.push({ type: 'corner', part: 'short-corner', pos: cursor.pos.clone(), rot: cursor.rot });
    advanceCorner();
  }

  return { segments, startCursor, config };
}

// TRACK COLLISION layer - simple invisible boxes following the layout above, at a fixed track width. Not wired
// to the driving physics yet (index.html's render loop is purely kinematic - no collision response), but this
// keeps real, correctly-placed collision geometry available underneath whichever VISUAL track is loaded on top,
// so wiring up actual collision later doesn't depend on the visual asset at all.
function buildTrackCollision(scene, layout, kitScale, trackWidth = 9) {
  const collisionRoot = new BABYLON.TransformNode('trackCollisionRoot', scene);
  layout.segments.forEach((seg, i) => {
    const depth = (seg.type === 'straight' ? layout.config.straightLen : 3) * kitScale;
    const box = BABYLON.MeshBuilder.CreateBox('trackCollision' + i, {
      width: trackWidth * kitScale,
      height: 1,
      depth,
    }, scene);
    box.position = seg.pos.scale(kitScale).add(new BABYLON.Vector3(0, 0.5, 0));
    box.rotation.y = seg.rot;
    box.isVisible = false;
    box.isPickable = false;
    box.parent = collisionRoot;
  });
  return collisionRoot;
}

// TRACK VISUAL layer, option A: the kit's own modular tiles - this is the CURRENT implementation, unchanged in
// behaviour from before this refactor, just reorganised to consume `layout` instead of driving its own cursor.
const TRACK_SCENERY_RULES = [
  { model: 'barrierWhite.glb', offset: -1.9, everyN: 2, appliesTo: 'long' },
  { model: 'barrierWhite.glb', offset: 1.9, everyN: 2, appliesTo: 'long' },
  { model: 'barrierWhite.glb', offset: -1.9, everyN: 1, appliesTo: 'short' },
  { model: 'barrierWhite.glb', offset: 1.9, everyN: 1, appliesTo: 'short' },
  { model: 'grandStand.glb', offset: 6, everyN: 3, appliesTo: 'long', faceOutward: true },
];

async function renderTrackVisualTiles(scene, layout, kitScale, shadowGenerator) {
  const tileFiles = ['roadStraightLong.glb', 'roadCornerLarge.glb'];
  const sceneryFiles = [...new Set(TRACK_SCENERY_RULES.map((r) => r.model))];
  const protos = {};
  await Promise.all([...tileFiles, ...sceneryFiles].map(async (file) => {
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', 'models/', file, scene);
    result.meshes[0].setEnabled(false);
    protos[file] = result.meshes[0];
  }));

  let index = 0;
  function place(file, pos, rot, receiveShadows) {
    const inst = protos[file].clone(file + index++, null);
    inst.setEnabled(true);
    inst.scaling.setAll(kitScale);
    inst.position = pos;
    inst.rotation.y = rot;
    inst.getChildMeshes().forEach((m) => {
      shadowGenerator.addShadowCaster(m);
      if (receiveShadows) m.receiveShadows = true;
    });
    return inst;
  }

  layout.segments.forEach((seg) => {
    const file = seg.type === 'straight' ? 'roadStraightLong.glb' : 'roadCornerLarge.glb';
    place(file, seg.pos.scale(kitScale), seg.rot, true);
    if (seg.type !== 'straight') return;
    TRACK_SCENERY_RULES.forEach((rule) => {
      if (rule.appliesTo !== seg.part || seg.index % rule.everyN !== 0) return;
      const side = new BABYLON.Vector3(Math.cos(seg.rot), 0, -Math.sin(seg.rot));
      const pos = seg.pos.add(side.scale(rule.offset)).scale(kitScale);
      place(rule.model, pos, seg.rot + (rule.faceOutward ? Math.PI : 0));
    });
  });

  // Start/finish checker line - cosmetic dressing on top of the visual layer, not part of layout/collision.
  const checkerDt = new BABYLON.DynamicTexture('checker', { width: 128, height: 512 }, scene, false);
  const cctx = checkerDt.getContext();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 2; c++) {
      cctx.fillStyle = (r + c) % 2 === 0 ? '#fff' : '#111';
      cctx.fillRect(c * 64, r * 64, 64, 64);
    }
  }
  checkerDt.update();
  const checkerMat = new BABYLON.StandardMaterial('checkerMat', scene);
  checkerMat.diffuseTexture = checkerDt;
  checkerMat.specularColor = new BABYLON.Color3(0, 0, 0);
  const startLine = BABYLON.MeshBuilder.CreatePlane('startLine', { width: 4, height: 2 }, scene);
  startLine.rotation.x = Math.PI / 2;
  startLine.position = layout.startCursor.pos.scale(kitScale)
    .add(new BABYLON.Vector3(0, 0.03, -layout.config.straightLen * kitScale * 0.5));
  startLine.material = checkerMat;
}

// TRACK VISUAL layer, option B: a single professionally-made circuit glTF/GLB, NOT IMPLEMENTED - there is no
// such asset yet and none has been downloaded. See the "Circuit" section of the asset requirements doc for what
// it needs to satisfy (origin/orientation matching layout.startCursor, real-world scale) before this can be
// written. buildTrackLayout()/buildTrackCollision() above do not need to change either way - only this function
// and TRACK_VISUAL_MODE below would need to change to switch over.
async function renderTrackVisualSingleMesh(scene, layout, kitScale, modelUrl) {
  throw new Error('renderTrackVisualSingleMesh() is not implemented - no circuit asset has been provided yet.');
}

const TRACK_VISUAL_MODE = 'tiles'; // 'tiles' (current, implemented) | 'single-mesh' (not implemented yet)
const TRACK_VISUAL_ASSET_URL = null; // set this when a single-mesh circuit asset exists

// Builds the logic/collision layers (always) plus whichever visual layer is configured, and returns the
// startCursor index.html needs to place the car and its cameras - the same contract regardless of visual mode.
async function buildTrack(scene, kitScale, shadowGenerator) {
  const layout = buildTrackLayout();
  buildTrackCollision(scene, layout, kitScale);
  if (TRACK_VISUAL_MODE === 'single-mesh') {
    await renderTrackVisualSingleMesh(scene, layout, kitScale, TRACK_VISUAL_ASSET_URL);
  } else {
    await renderTrackVisualTiles(scene, layout, kitScale, shadowGenerator);
  }
  return layout.startCursor;
}
