// VEHICLE VISUAL layer - swappable independently of the physics/handling model, which lives entirely in
// index.html's render loop and never reads anything from this file except the `wheelNodes` it hands back.
//
// To swap the car for a different glTF/GLB: change VEHICLE_VISUAL.modelFile below (and wheelNodeNames if the new
// asset names its wheel nodes differently, or leave them null if it has none). See the "Racing car" section of
// the asset requirements doc for exactly what a replacement model needs to satisfy.
const VEHICLE_VISUAL = {
  modelFile: (carSpec) => (carSpec.electric ? 'raceCarGreen.glb' : 'raceCarRed.glb'),
  scale: 4.5,
  // Node names inside the model that the physics loop spins/steers for the wheel visuals. If a replacement asset
  // doesn't expose matching node names, loadVehicleVisual() just returns nulls for those and the render loop's
  // `if (wheelNodes.fl)` guard silently skips wheel animation - the car still drives correctly, just without
  // visible wheel spin until this config is updated to match the new asset.
  wheelNodeNames: { fl: 'wheelFrontLeft', fr: 'wheelFrontRight', bl: 'wheelBackLeft', br: 'wheelBackRight' },
};

// Approximate real-world footprint of the current car model (native bounding box * VEHICLE_VISUAL.scale), used
// only for the invisible collision proxy below. Update this if a replacement model has different dimensions.
const VEHICLE_COLLISION_SIZE = { length: 6.1, width: 3.3, height: 1.8 };

// Imports the car's VISUAL mesh only and parents it to `parentNode` (the physics-driven TransformNode owned by
// index.html). Returns the wheel node references the render loop uses for wheel-spin/steer visuals - never the
// physics body itself, which index.html already owns before this is called.
async function loadVehicleVisual(scene, parentNode, carSpec, shadowGenerator) {
  const file = VEHICLE_VISUAL.modelFile(carSpec);
  const result = await BABYLON.SceneLoader.ImportMeshAsync('', 'models/', file, scene);
  result.meshes[0].parent = parentNode;
  result.meshes[0].scaling.setAll(VEHICLE_VISUAL.scale);
  result.meshes.forEach((m) => shadowGenerator.addShadowCaster(m));
  const byName = (name) => (name ? result.transformNodes.find((n) => n.name === name) : null);
  return {
    fl: byName(VEHICLE_VISUAL.wheelNodeNames.fl),
    fr: byName(VEHICLE_VISUAL.wheelNodeNames.fr),
    bl: byName(VEHICLE_VISUAL.wheelNodeNames.bl),
    br: byName(VEHICLE_VISUAL.wheelNodeNames.br),
  };
}

// VEHICLE COLLISION layer - a simple invisible box standing in for the car's real footprint. Not wired to any
// physics yet: index.html's driving model is still purely kinematic (position/rotation only, no collision
// response), so this exists only so a future collision pass has real geometry to test against, independent of
// whatever visual model is loaded on top. The car's own origin sits at its nose (not its centre), hence the
// backward offset below - see the "Racing car" asset requirements for why that convention matters.
function createVehicleCollisionProxy(scene, parentNode) {
  const box = BABYLON.MeshBuilder.CreateBox('vehicleCollisionProxy', {
    width: VEHICLE_COLLISION_SIZE.width,
    height: VEHICLE_COLLISION_SIZE.height,
    depth: VEHICLE_COLLISION_SIZE.length,
  }, scene);
  box.position = new BABYLON.Vector3(0, VEHICLE_COLLISION_SIZE.height / 2, -VEHICLE_COLLISION_SIZE.length / 2);
  box.parent = parentNode;
  box.isVisible = false;
  box.isPickable = false;
  return box;
}
