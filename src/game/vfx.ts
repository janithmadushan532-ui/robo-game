import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  baseScale: number;
  active: boolean;
}

interface ShockRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxScale: number;
  active: boolean;
}

export interface ActiveProjectile {
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  owner: 'player' | 'boss';
  damage: number;
  color: number;
  radius: number;
  life: number;
  effect: 'none' | 'slow' | 'stun' | 'pierce' | 'knockback';
  homing: boolean;
  active: boolean;
}

interface GroundPillar {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  life: number;
  maxLife: number;
  active: boolean;
}

interface LaserBeam {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  active: boolean;
}

interface MeteorDrop {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  duration: number;
  delay: number;
  color: number;
  active: boolean;
  onImpact?: () => void;
}

interface TransferOrb {
  group: THREE.Group;
  mat: THREE.MeshBasicMaterial;
  start: THREE.Vector3;
  end: THREE.Vector3;
  progress: number;
  duration: number;
  color: number;
  active: boolean;
}

const _tmpVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

export class VfxManager {
  private group = new THREE.Group();
  private particles: Particle[] = [];
  private rings: ShockRing[] = [];
  private pillars: GroundPillar[] = [];
  private beams: LaserBeam[] = [];
  private meteors: MeteorDrop[] = [];
  private transferOrbs: TransferOrb[] = [];
  public projectiles: ActiveProjectile[] = [];
  public particleBudgetScale = 1.0;

  private sharedParticleGeo = new THREE.DodecahedronGeometry(0.14, 0);
  private sharedRingGeo = new THREE.RingGeometry(0.7, 1.0, 28);
  private sharedConeGeo = new THREE.ConeGeometry(0.45, 2.8, 6);
  private sharedProjCoreGeo = new THREE.SphereGeometry(0.32, 10, 10);
  private sharedProjHaloGeo = new THREE.TorusGeometry(0.48, 0.06, 6, 16);
  private sharedBeamGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
  private sharedMeteorGeo = new THREE.DodecahedronGeometry(0.46, 0);

  constructor(scene: THREE.Scene) {
    this.sharedRingGeo.rotateX(-Math.PI / 2);
    scene.add(this.group);

    // Pre-allocate particle pool (zero runtime allocation)
    for (let i = 0; i < 160; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(this.sharedParticleGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        gravity: 9.8,
        baseScale: 1,
        active: false,
      });
    }

    // Pre-allocate shockwave rings
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedRingGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({
        mesh,
        mat,
        life: 0,
        maxLife: 0.45,
        maxScale: 4,
        active: false,
      });
    }

    // Pre-allocate ground pillars
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x84cc16,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.sharedConeGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.pillars.push({
        mesh,
        mat,
        life: 0,
        maxLife: 0.7,
        active: false,
      });
    }

    // Pre-allocate pooled projectiles (eliminates GC spikes during battle)
    for (let i = 0; i < 28; i++) {
      const grp = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const core = new THREE.Mesh(this.sharedProjCoreGeo, coreMat);
      const halo = new THREE.Mesh(this.sharedProjHaloGeo, haloMat);
      grp.add(core, halo);
      grp.visible = false;
      this.group.add(grp);
      this.projectiles.push({
        group: grp,
        coreMat,
        haloMat,
        pos: grp.position,
        vel: new THREE.Vector3(),
        owner: 'player',
        damage: 0,
        color: 0xffffff,
        radius: 0.5,
        life: 0,
        effect: 'none',
        homing: false,
        active: false,
      });
    }

    // Pre-allocate laser beams
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.sharedBeamGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.beams.push({ mesh, mat, life: 0, maxLife: 0.22, active: false });
    }

    // Pre-allocate meteor drops
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const mesh = new THREE.Mesh(this.sharedMeteorGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.meteors.push({
        mesh,
        mat,
        startPos: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        progress: 0,
        duration: 0.45,
        delay: 0,
        color: 0xf43f5e,
        active: false,
      });
    }

    // Pre-allocate MCQ power transfer orbs
    for (let i = 0; i < 4; i++) {
      const grp = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const orb = new THREE.Mesh(this.sharedProjCoreGeo, mat);
      const halo = new THREE.Mesh(this.sharedProjHaloGeo, mat);
      grp.add(orb, halo);
      grp.visible = false;
      this.group.add(grp);
      this.transferOrbs.push({
        group: grp,
        mat,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        progress: 0,
        duration: 0.72,
        color: 0x38bdf8,
        active: false,
      });
    }
  }

  public spawnBurst(
    pos: THREE.Vector3,
    color: number,
    count = 14,
    speed = 7,
    scale = 1.0,
    gravity = 9.0,
  ) {
    const targetCount = Math.max(3, Math.round(count * this.particleBudgetScale));
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.28 + Math.random() * 0.25;
      p.gravity = gravity;
      p.baseScale = scale * (0.65 + Math.random() * 0.65);
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(p.baseScale);
      p.mat.color.setHex(color);
      p.mat.opacity = 1;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.65;
      const spd = speed * (0.45 + Math.random() * 0.75);
      p.vel.set(
        Math.cos(theta) * Math.sin(phi) * spd,
        Math.cos(phi) * spd + 1.4,
        Math.sin(theta) * Math.sin(phi) * spd,
      );

      spawned++;
      if (spawned >= targetCount) break;
    }
  }

  public spawnShockRing(pos: THREE.Vector3, color: number, maxScale = 4.2, duration = 0.42) {
    let slot = this.rings.find((r) => !r.active);
    if (!slot) {
      slot = this.rings.reduce((oldest, cur) =>
        cur.life / cur.maxLife > oldest.life / oldest.maxLife ? cur : oldest,
      );
    }
    slot.active = true;
    slot.life = 0;
    slot.maxLife = duration;
    slot.maxScale = maxScale;
    slot.mesh.visible = true;
    slot.mesh.position.set(pos.x, Math.max(0.08, pos.y), pos.z);
    slot.mesh.scale.setScalar(0.35);
    slot.mat.color.setHex(color);
    slot.mat.opacity = 0.95;
  }

  public spawnPillar(pos: THREE.Vector3, color: number, heightScale = 1.2, inverted = false) {
    let slot = this.pillars.find((pl) => !pl.active);
    if (!slot) {
      slot = this.pillars.reduce((oldest, cur) =>
        cur.life / cur.maxLife > oldest.life / oldest.maxLife ? cur : oldest,
      );
    }
    slot.active = true;
    slot.life = 0;
    slot.maxLife = 0.72;
    slot.mesh.visible = true;
    slot.mesh.position.set(pos.x, inverted ? 2.6 * heightScale : 1.1 * heightScale, pos.z);
    slot.mesh.rotation.x = inverted ? Math.PI : 0;
    slot.mesh.scale.set(heightScale, heightScale, heightScale);
    slot.mat.color.setHex(color);
    slot.mat.emissive.setHex(color);
    slot.mat.opacity = 0.95;
  }

  public spawnLaserBeam(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    let slot = this.beams.find((b) => !b.active);
    if (!slot) {
      slot = this.beams.reduce((oldest, cur) =>
        cur.life / cur.maxLife > oldest.life / oldest.maxLife ? cur : oldest,
      );
    }
    slot.active = true;
    slot.life = 0;
    slot.maxLife = 0.24;
    slot.mat.color.setHex(color);
    slot.mat.opacity = 0.98;
    _tmpVec.copy(to).sub(from);
    const len = Math.max(0.5, _tmpVec.length());
    slot.mesh.position.copy(from).addScaledVector(_tmpVec, 0.5);
    slot.mesh.scale.set(1.2, len, 1.2);
    slot.mesh.quaternion.setFromUnitVectors(_upVec, _tmpVec.normalize());
    slot.mesh.visible = true;
  }

  public spawnMeteor(targetPos: THREE.Vector3, color: number, delay = 0, onImpact?: () => void) {
    let slot = this.meteors.find((m) => !m.active);
    if (!slot) {
      slot = this.meteors.reduce((oldest, cur) =>
        cur.progress > oldest.progress ? cur : oldest,
      );
    }
    slot.active = true;
    slot.progress = 0;
    slot.duration = 0.42;
    slot.delay = delay;
    slot.color = color;
    slot.mat.color.setHex(color);
    slot.targetPos.set(targetPos.x, 0.2, targetPos.z);
    slot.startPos.set(
      targetPos.x + (Math.random() - 0.5) * 3.2,
      11.5,
      targetPos.z + (Math.random() - 0.5) * 3.2,
    );
    slot.mesh.position.copy(slot.startPos);
    slot.mesh.visible = delay <= 0;
    slot.onImpact = onImpact;
  }

  public spawnTransferOrb(start: THREE.Vector3, end: THREE.Vector3, color: number) {
    for (const orb of this.transferOrbs) {
      if (orb.active) continue;
      orb.active = true;
      orb.progress = 0;
      orb.duration = 0.72;
      orb.color = color;
      orb.mat.color.setHex(color);
      orb.start.copy(start);
      orb.end.copy(end);
      orb.group.position.copy(start);
      orb.group.scale.setScalar(1.35);
      orb.group.visible = true;
      break;
    }
  }

  public spawnProjectile(opts: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    owner: 'player' | 'boss';
    damage: number;
    color: number;
    radius?: number;
    effect?: ActiveProjectile['effect'];
    homing?: boolean;
  }) {
    let pr = this.projectiles.find((item) => !item.active);
    if (!pr) {
      // Recycle oldest projectile (prefer player/lowest life) so unlimited power spam never freezes or drops inputs
      pr = this.projectiles.reduce((oldest, cur) => (cur.life < oldest.life ? cur : oldest));
    }
    pr.active = true;
    pr.owner = opts.owner;
    pr.damage = opts.damage;
    pr.color = opts.color;
    pr.radius = opts.radius ?? 0.55;
    pr.life = 2.4;
    pr.effect = opts.effect ?? 'none';
    pr.homing = Boolean(opts.homing);
    pr.coreMat.color.setHex(opts.color);
    pr.haloMat.color.setHex(opts.color);
    const scale = (opts.radius ?? 0.45) / 0.45;
    pr.group.scale.setScalar(scale);
    pr.group.position.copy(opts.origin);
    pr.vel.copy(opts.direction).normalize().multiplyScalar(opts.speed);
    pr.group.visible = true;
  }

  public clearProjectiles() {
    for (const pr of this.projectiles) {
      pr.active = false;
      pr.group.visible = false;
    }
    for (const m of this.meteors) {
      m.active = false;
      m.mesh.visible = false;
    }
    for (const b of this.beams) {
      b.active = false;
      b.mesh.visible = false;
    }
  }

  public update(
    dt: number,
    playerPos?: THREE.Vector3,
    bossPos?: THREE.Vector3,
    bossProjTimeScale = 1.0,
  ) {
    // Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.06) {
        p.mesh.position.y = 0.06;
        p.vel.y *= -0.35;
      }
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 6;
      p.mat.opacity = 1 - t;
      p.mesh.scale.setScalar(p.baseScale * (1 - t * 0.5));
    }

    // Shockwave rings
    for (const r of this.rings) {
      if (!r.active) continue;
      r.life += dt;
      if (r.life >= r.maxLife) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const t = r.life / r.maxLife;
      const s = 0.35 + (r.maxScale - 0.35) * (1 - Math.pow(1 - t, 2));
      r.mesh.scale.setScalar(s);
      r.mat.opacity = (1 - t) * 0.9;
    }

    // Ground pillars
    for (const pl of this.pillars) {
      if (!pl.active) continue;
      pl.life += dt;
      if (pl.life >= pl.maxLife) {
        pl.active = false;
        pl.mesh.visible = false;
        continue;
      }
      const t = pl.life / pl.maxLife;
      pl.mat.opacity = t < 0.7 ? 0.95 : 1 - (t - 0.7) / 0.3;
    }

    // Laser beams
    for (const b of this.beams) {
      if (!b.active) continue;
      b.life += dt;
      if (b.life >= b.maxLife) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      const t = b.life / b.maxLife;
      b.mat.opacity = 1 - t;
      b.mesh.scale.x = 1.3 * (1 - t * 0.65);
      b.mesh.scale.z = 1.3 * (1 - t * 0.65);
    }

    // Meteors
    for (const m of this.meteors) {
      if (!m.active) continue;
      if (m.delay > 0) {
        m.delay -= dt;
        if (m.delay <= 0) m.mesh.visible = true;
        continue;
      }
      m.progress += dt / m.duration;
      if (m.progress >= 1) {
        m.active = false;
        m.mesh.visible = false;
        this.spawnBurst(m.targetPos, m.color, 16, 7.5, 1.15, 6);
        this.spawnShockRing(m.targetPos, m.color, 4.0, 0.42);
        m.onImpact?.();
        continue;
      }
      m.mesh.position.lerpVectors(m.startPos, m.targetPos, m.progress);
      m.mesh.rotation.x += dt * 10;
      m.mesh.rotation.y += dt * 8;
    }

    // MCQ Power Transfer Orbs
    for (const orb of this.transferOrbs) {
      if (!orb.active) continue;
      orb.progress += dt / orb.duration;
      if (orb.progress >= 1) {
        orb.active = false;
        orb.group.visible = false;
        this.spawnBurst(orb.end, orb.color, 20, 7.5, 1.25, 4);
        _tmpVec.copy(orb.end).setY(0.1);
        this.spawnShockRing(_tmpVec, orb.color, 3.8, 0.5);
        continue;
      }
      const t = orb.progress;
      const ease = 1 - Math.pow(1 - t, 2);
      orb.group.position.lerpVectors(orb.start, orb.end, ease);
      orb.group.position.y += Math.sin(t * Math.PI) * 2.2;
      orb.group.rotation.y += dt * 12;
      orb.group.rotation.z += dt * 9;
    }

    // Pooled Projectiles (with optional homing & Time Slow support)
    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      const pDt = pr.owner === 'boss' ? dt * bossProjTimeScale : dt;
      pr.life -= pDt;
      if (pr.homing) {
        const target = pr.owner === 'player' ? bossPos : playerPos;
        if (target) {
          _tmpVec.set(target.x, 1.3, target.z).sub(pr.pos).normalize();
          const speed = pr.vel.length();
          pr.vel.lerp(_tmpVec.multiplyScalar(speed), Math.min(1, pDt * 4.5));
        }
      }
      pr.pos.addScaledVector(pr.vel, pDt);
      pr.group.rotation.z += pDt * 10;
      pr.group.rotation.x += pDt * 6;
      if (pr.life <= 0) {
        pr.active = false;
        pr.group.visible = false;
      }
    }
  }

  public dispose() {
    this.sharedParticleGeo.dispose();
    this.sharedRingGeo.dispose();
    this.sharedConeGeo.dispose();
    this.sharedProjCoreGeo.dispose();
    this.sharedProjHaloGeo.dispose();
    this.sharedBeamGeo.dispose();
    this.sharedMeteorGeo.dispose();
    this.particles.forEach((p) => p.mat.dispose());
    this.rings.forEach((r) => r.mat.dispose());
    this.pillars.forEach((pl) => pl.mat.dispose());
    this.beams.forEach((b) => b.mat.dispose());
    this.meteors.forEach((m) => m.mat.dispose());
    this.transferOrbs.forEach((o) => o.mat.dispose());
    this.projectiles.forEach((pr) => {
      pr.coreMat.dispose();
      pr.haloMat.dispose();
    });
  }
}
