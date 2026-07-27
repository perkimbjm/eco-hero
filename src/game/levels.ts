import type {
  LevelDef,
  AchievementDef,
  TrashType,
  TrashItemKind,
  SecretType,
  PlatformKind,
  PowerUpKind,
  MoveAxis,
} from './types';
import { GAME_HEIGHT, TILE } from './constants';

const GROUND_Y = GAME_HEIGHT - 80;
const ROW = (r: number) => r * TILE;

function brick(x: number, row: number, length = 1) {
  return { x, y: ROW(row), width: length * TILE, height: TILE, type: 'brick' as const };
}

function movingPlatform(
  x: number,
  row: number,
  range: number,
  speed = 60,
  length = 2,
  phase = 0,
  opts: { axis?: MoveAxis; kind?: PlatformKind } = {}
) {
  return {
    x,
    y: ROW(row),
    width: length * TILE,
    height: TILE,
    range,
    speed,
    phase,
    axis: opts.axis,
    kind: opts.kind,
  };
}

/** Same slab as `brick`, dressed as a piece of forest instead. */
function forestPlatform(x: number, row: number, length: number, type: PlatformKind) {
  return { x, y: ROW(row), width: length * TILE, height: TILE, type };
}

const log = (x: number, row: number, length = 3) => forestPlatform(x, row, length, 'log');
const boulder = (x: number, row: number, length = 2) => forestPlatform(x, row, length, 'boulder');
const branch = (x: number, row: number, length = 3) => forestPlatform(x, row, length, 'branch');
const stump = (x: number, row: number, length = 3) => forestPlatform(x, row, length, 'stump');

/** A log slung from a branch at `row`, hanging `length` px below the anchor. */
function swayingLog(
  x: number,
  row: number,
  length: number,
  width: number,
  swayDeg: number,
  speed: number,
  phase: number
) {
  return { x, y: ROW(row), length, width, swayDeg, speed, phase };
}

function hangingSnake(
  x: number,
  row: number,
  length: number,
  swayDeg: number,
  speed: number,
  phase: number
) {
  return { x, y: ROW(row), length, swayDeg, speed, phase };
}

function mud(x: number, width: number) {
  return { x, width };
}

/** A narrow stone shelf that gives way shortly after it is stood on. */
function crumbleRock(x: number, row: number, length = 2) {
  return { x, y: ROW(row), width: length * TILE };
}

function lightning(x: number, width: number, intervalMs: number, phase: number) {
  return { x, width, intervalMs, phase };
}

function trashBird(x: number, row: number, range = 220) {
  return { x, y: ROW(row), range };
}

function rollingBoulder(
  x: number,
  dir: -1 | 1,
  speed: number,
  distance: number,
  intervalMs: number,
  phase: number,
  y = GROUND_Y - 26
) {
  return { x, y, dir, speed, distance, intervalMs, phase };
}

function waterfall(x: number, row: number, widthTiles: number, heightTiles: number) {
  return { x, y: ROW(row), width: widthTiles * TILE, height: heightTiles * TILE };
}

function checkpoint(x: number) {
  return { x, y: GROUND_Y };
}

function trash(x: number, y: number, type: TrashType, item?: TrashItemKind) {
  return { x, y, type, item };
}

/** Limbah B3 — hazardous waste, always shown as itself rather than pooled. */
function hazardTrash(x: number, y: number) {
  return { x, y, type: 'hazard' as const, item: 'limbahB3' as const };
}

function secret(x: number, y: number, type: SecretType) {
  return { x, y, type };
}

function enemy(x: number, range: number) {
  return { x, y: GROUND_Y - 36, range };
}

function flyingEnemy(x: number, y: number, range: number, amplitude: number, speed: number) {
  return { x, y, range, amplitude, speed };
}

function giantFly(x: number, row: number, range: number, amplitude: number, speed: number) {
  return { x, y: ROW(row), range, amplitude, speed };
}

function toxicWaste(x: number, width: number) {
  return { x, width };
}

function healthPickup(x: number, y: number) {
  return { x, y };
}

function boost(x: number, y: number, type: 'magnet' | 'shield' | 'jump') {
  return { x, y, type };
}

/**
 * Hidden "?" block, placed on the tile grid like a brick. Row 6 sits 120px above
 * the ground — out of reach on foot, but a plain jump bonks it from below.
 */
function mysteryBlock(
  x: number,
  row: number,
  item: PowerUpKind,
  disguise?: 'crate' | 'stump' | 'boulder'
) {
  return { x, y: ROW(row), item, disguise };
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'Taman Kota',
    subtitle: 'Bumi mulai kotor... bantu bersihkan taman!',
    theme: 'park',
    width: 3200,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    platforms: [
      brick(400, 8, 3),
      brick(800, 6, 2),
      brick(1050, 8, 4),
      brick(1500, 7, 3),
      brick(1900, 5, 2),
      brick(2150, 7, 4),
      brick(2600, 6, 3),
    ],
    // Taman kota: sampah piknik dan jajanan pengunjung.
    trashItems: {
      plastic: ['botolPlastik', 'gelasPlastik', 'kantongPlastik'],
      paper: ['kertas'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(250, GROUND_Y - 30, 'plastic'),
      trash(460, ROW(8) - 20, 'paper'),
      trash(600, GROUND_Y - 30, 'organic'),
      trash(840, ROW(6) - 20, 'plastic'),
      trash(1100, ROW(8) - 20, 'metal'),
      trash(1250, GROUND_Y - 30, 'paper'),
      trash(1560, ROW(7) - 20, 'glass'),
      trash(1700, GROUND_Y - 30, 'plastic'),
      trash(1950, ROW(5) - 20, 'organic'),
      trash(2250, ROW(7) - 20, 'paper'),
      trash(2400, GROUND_Y - 30, 'metal'),
      trash(2700, ROW(6) - 20, 'glass'),
      trash(2850, GROUND_Y - 30, 'plastic'),
    ],
    secrets: [
      secret(530, ROW(8) - 50, 'maggot'),
      secret(1980, ROW(5) - 50, 'compost'),
    ],
    enemies: [
      enemy(700, 120),
      enemy(1350, 120),
      enemy(2050, 120),
      enemy(2500, 120),
    ],
    healthPickups: [
      healthPickup(1600, GROUND_Y - 120),
    ],
    // Tucked into the empty stretch between the two brick clusters, so it only
    // turns up if the player jumps where there is seemingly nothing.
    mysteryBlocks: [
      mysteryBlock(1360, 6, 'ecoBadge'),
    ],
    goal: { x: 3050, y: GROUND_Y },
    story: {
      intro:
        'Pohon Kehidupan berbisik: "Eco Hero, bumi sedang sakit. Sampah menumpuk di mana-mana. Mulailah dari taman kota — kumpulkan semua sampah, hati-hati dengan polusi!"',
      outro:
        'Taman kota kini hijau dan bersih! Bunga mulai bermekaran, burung berkicau kembali. Tapi masih banyak tempat yang butuh bantuanmu...',
    },
    fact: {
      title: 'Sampah Plastik',
      text: 'Plastik butuh 500 tahun untuk terurai! Botol plastik yang dibuang sembarangan bisa mencemari tanah dan air.',
      tip: 'Gunakan botol minum ulang dan kantong kain untuk mengurangi sampah plastik.',
    },
    timeTarget: 60000,
  },
  {
    id: 2,
    name: 'Pantai Indah',
    subtitle: 'Selamatkan laut dari sampah plastik!',
    theme: 'beach',
    width: 3400,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    platforms: [
      brick(350, 9, 2),
      brick(550, 7, 2),
      brick(750, 8, 3),
      brick(1100, 6, 2),
      brick(1300, 8, 3),
      brick(1700, 5, 2),
      brick(1950, 7, 3),
      brick(2350, 6, 2),
      brick(2550, 8, 3),
      brick(2950, 7, 2),
    ],
    // Pantai: botol dan gelas minuman yang terbawa ombak.
    trashItems: {
      plastic: ['botolPlastik', 'gelasPlastik'],
      paper: ['kertas'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(200, GROUND_Y - 30, 'plastic'),
      trash(400, ROW(9) - 20, 'glass'),
      trash(580, ROW(7) - 20, 'plastic'),
      trash(820, ROW(8) - 20, 'metal'),
      trash(1000, GROUND_Y - 30, 'paper'),
      trash(1150, ROW(6) - 20, 'plastic'),
      trash(1400, ROW(8) - 20, 'organic'),
      trash(1600, GROUND_Y - 30, 'glass'),
      trash(1750, ROW(5) - 20, 'plastic'),
      trash(2050, ROW(7) - 20, 'metal'),
      trash(2250, GROUND_Y - 30, 'plastic'),
      trash(2400, ROW(6) - 20, 'paper'),
      trash(2650, ROW(8) - 20, 'glass'),
      trash(2850, GROUND_Y - 30, 'plastic'),
      trash(3050, ROW(7) - 20, 'organic'),
    ],
    secrets: [
      secret(880, ROW(8) - 50, 'maggot'),
      secret(1990, ROW(7) - 50, 'compost'),
    ],
    enemies: [
      enemy(650, 100),
      enemy(1200, 120),
      enemy(1800, 100),
      enemy(2300, 120),
      enemy(2800, 100),
    ],
    healthPickups: [
      healthPickup(1450, ROW(8) - 20),
      healthPickup(2700, GROUND_Y - 120),
    ],
    goal: { x: 3250, y: GROUND_Y },
    story: {
      intro:
        'Pohon Kehidupan: "Pantai yang dulu biru kini penuh plastik. Penyu dan ikan terjebak! Kumpulkan sampah plastik dan hati-hati dengan polusi laut!"',
      outro:
        'Pantai kembali bersih! Pasir putih berkilau, ombak jernih, dan penyu berenang bebas tanpa takut tertelan plastik.',
    },
    fact: {
      title: 'Bahaya Sampah di Laut',
      text: 'Setiap tahun, 8 juta ton plastik masuk ke laut! Plastik dibuang sembarangan dibingungkan penyu dan ikan sebagai makanan.',
      tip: 'Bawa wadah sendiri saat membeli minum, dan jangan pernah tinggalkan sampah di pantai.',
    },
    timeTarget: 60000,
  },
  {
    id: 3,
    name: 'Tepi Sungai',
    subtitle: 'Selamatkan sungai dan kembalikan ikannya!',
    theme: 'river',
    width: 3600,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    platforms: [
      brick(300, 8, 2),
      brick(500, 6, 2),
      brick(700, 8, 2),
      brick(950, 5, 2),
      brick(1150, 7, 3),
      brick(1550, 6, 2),
      brick(1750, 4, 2),
      brick(1950, 6, 2),
      brick(2200, 8, 3),
      brick(2600, 5, 2),
      brick(2800, 7, 3),
      brick(3200, 6, 2),
    ],
    // Sungai: kantong kresek dan kardus hanyut dari pemukiman.
    trashItems: {
      plastic: ['kantongPlastik', 'botolPlastik'],
      paper: ['kardus', 'kertas'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(180, GROUND_Y - 30, 'organic'),
      trash(350, ROW(8) - 20, 'plastic'),
      trash(550, ROW(6) - 20, 'paper'),
      trash(780, ROW(8) - 20, 'metal'),
      trash(1000, ROW(5) - 20, 'glass'),
      trash(1250, ROW(7) - 20, 'plastic'),
      trash(1450, GROUND_Y - 30, 'paper'),
      trash(1600, ROW(6) - 20, 'organic'),
      trash(1800, ROW(4) - 20, 'plastic'),
      trash(2050, ROW(6) - 20, 'metal'),
      trash(2300, ROW(8) - 20, 'glass'),
      trash(2500, GROUND_Y - 30, 'plastic'),
      trash(2700, ROW(5) - 20, 'paper'),
      trash(2950, ROW(7) - 20, 'plastic'),
      trash(3150, GROUND_Y - 30, 'metal'),
      trash(3350, ROW(6) - 20, 'glass'),
    ],
    secrets: [
      secret(1030, ROW(5) - 50, 'maggot'),
      secret(1830, ROW(4) - 50, 'compost'),
      secret(3150, GROUND_Y - 90, 'maggot'),
    ],
    enemies: [
      enemy(600, 100),
      enemy(1100, 120),
      enemy(1600, 100),
      enemy(2100, 100),
      enemy(2600, 120),
      enemy(3100, 100),
    ],
    healthPickups: [
      healthPickup(1400, GROUND_Y - 120),
      healthPickup(2900, ROW(7) - 20),
    ],
    mysteryBlocks: [
      mysteryBlock(2450, 6, 'ecoVest'),
    ],
    goal: { x: 3450, y: GROUND_Y },
    story: {
      intro:
        'Pohon Kehidupan: "Sungai ini dulu penuh ikan, kini airnya keruh dan beracun. Sampah mengalir dari hulu ke hilir. Bersihkan dan kembalikan ikannya!"',
      outro:
        'Sungai kini jernih mengalir! Ikan-ikan kembali berenang, eceng gondok tumbuh seimbang, dan suara air terdengar seperti musik.',
    },
    fact: {
      title: 'Sungai yang Tercemar',
      text: 'Sampah yang masuk ke sungai akan mengalir ke laut. Sungai yang kotor dapat membunuh ikan dan merusak ekosistem air.',
      tip: 'Buang sampah pada tempatnya. Mulai pemungutan sampah dari hulu sungai untuk efek terbesar.',
    },
    timeTarget: 60000,
  },
  {
    id: 4,
    name: 'Tempat Pembuangan Akhir',
    subtitle: 'Lewati limbah beracun, kalahkan Raja Sampah TPA!',
    theme: 'landfill',
    width: 4750,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    platforms: [
      brick(300, 8, 2),
      brick(500, 6, 2),
      brick(700, 4, 2),
      brick(950, 7, 2),
      brick(1200, 5, 3),
      brick(1500, 8, 2),
      brick(1750, 4, 2),
      brick(1950, 6, 2),
      brick(2200, 3, 2),
      brick(2400, 6, 3),
      brick(2750, 8, 2),
      brick(2950, 5, 2),
      brick(3200, 7, 3),
      // Boss arena — a perch to escape the Trash King's ground slam.
      brick(4080, 5, 2),
      brick(4340, 6, 2),
    ],
    // TPA: campuran segala jenis, termasuk limbah B3 dari elektronik.
    trashItems: {
      plastic: ['kantongPlastik', 'gelasPlastik', 'botolPlastik'],
      paper: ['kardus', 'kertas'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(160, GROUND_Y - 30, 'plastic'),
      trash(350, ROW(8) - 20, 'paper'),
      trash(560, ROW(6) - 20, 'metal'),
      trash(760, ROW(4) - 20, 'glass'),
      trash(1000, ROW(7) - 20, 'plastic'),
      trash(1250, ROW(5) - 20, 'organic'),
      trash(1450, GROUND_Y - 30, 'metal'),
      trash(1550, ROW(8) - 20, 'plastic'),
      trash(1800, ROW(4) - 20, 'paper'),
      trash(2000, ROW(6) - 20, 'glass'),
      trash(2250, ROW(3) - 20, 'plastic'),
      trash(2450, ROW(6) - 20, 'metal'),
      trash(2700, GROUND_Y - 30, 'plastic'),
      trash(2850, ROW(8) - 20, 'paper'),
      trash(3050, ROW(5) - 20, 'glass'),
      trash(3300, ROW(7) - 20, 'organic'),
      trash(3500, GROUND_Y - 30, 'plastic'),
      // Discarded electronics — the one place B3 waste belongs in the story.
      hazardTrash(1150, GROUND_Y - 30),
      hazardTrash(2600, GROUND_Y - 30),
    ],
    secrets: [
      secret(780, ROW(4) - 50, 'maggot'),
      secret(1800, ROW(4) - 50, 'compost'),
      secret(2270, ROW(3) - 50, 'compost'),
      secret(3300, ROW(7) - 50, 'maggot'),
    ],
    enemies: [
      enemy(550, 100),
      enemy(1050, 100),
      enemy(1500, 120),
      enemy(2000, 100),
      enemy(2400, 120),
      enemy(2850, 100),
      enemy(3300, 100),
    ],
    giantFlies: [
      giantFly(900, 5, 70, 30, 55),
      giantFly(1650, 6, 80, 35, 60),
      giantFly(2350, 4, 70, 40, 65),
      giantFly(3050, 6, 90, 30, 58),
      giantFly(3560, 5, 70, 35, 62),
    ],
    toxicWaste: [
      toxicWaste(820, 110),
      toxicWaste(1700, 120),
      toxicWaste(2140, 110),
      toxicWaste(3020, 120),
      toxicWaste(3600, 100),
    ],
    boss: {
      name: 'Raja Sampah TPA',
      x: 4380,
      y: GROUND_Y - 85,
      machineX: 3920,
      machineY: GROUND_Y - 58,
      arenaStart: 3800,
      arenaEnd: 4560,
      phases: ['plastic', 'metal', 'glass'],
    },
    healthPickups: [
      healthPickup(1300, ROW(5) - 20),
      healthPickup(2600, GROUND_Y - 120),
      healthPickup(3400, ROW(7) - 20),
      healthPickup(3860, GROUND_Y - 130),
    ],
    goal: { x: 4640, y: GROUND_Y },
    story: {
      intro:
        'Pohon Kehidupan: "Inilah tempat akhir — TPA yang penuh sampah. Awas gundukan limbah beracun dan lalat raksasa! Di ujung sana bertahta Raja Sampah TPA. Kalahkan dia dengan energi daur ulang!"',
      outro:
        'Raja Sampah TPA runtuh menjadi tumpukan bahan daur ulang! TPA berubah menjadi pusat daur ulang yang hijau, dan pohon-pohon tumbuh di atas tanah yang dulu penuh sampah.',
    },
    fact: {
      title: 'Daur Ulang Selamatkan Bumi',
      text: 'Mendaur ulang 1 ton kertas menyelamatkan 17 pohon! Daur ulang aluminium hemat 95% energi dibanding membuat dari bahan baru. Limbah B3 seperti baterai dan elektronik rusak wajib dipisah karena meracuni tanah dan air.',
      tip: 'Pisahkan sampah organik, anorganik, dan B3 di rumah. Mulailah kompos dari sisa makanan.',
    },
    timeTarget: 140000,
  },
  {
    id: 5,
    name: 'Hutan Hijau',
    subtitle: 'Rawa, batang bergoyang, dan ular — jaga keseimbangan hutan!',
    theme: 'forest',
    width: 4200,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    // Everything the player stands on is a piece of the forest: tunggul, batu
    // besar, batang tumbang, dan dahan berdaun. Kotak tabraknya tetap persegi
    // supaya mendarat tidak pernah jadi tebakan.
    platforms: [
      stump(300, 8, 3),
      boulder(560, 6, 2),
      // Jalur kering di atas rawa pertama — alternatif dari menerjang lumpur.
      // Sengaja di baris 7, bukan 8: baris 8 hanya menyisakan 2px di atas kepala
      // pemain, dan menyeret kepala sepanjang rawa terasa seperti bug.
      log(760, 7, 4),
      branch(1000, 5, 3),
      stump(1180, 7, 3),
      log(1400, 5, 3),
      boulder(1620, 8, 2),
      // 1700-2080 sengaja kosong: satu-satunya jalan ke atas adalah batang
      // bergoyang.
      log(2100, 7, 4),
      stump(2400, 6, 3),
      branch(2620, 4, 3),
      boulder(2820, 7, 2),
      log(3000, 5, 3),
      // Juga baris 7 — berdiri di atas rawa ketiga.
      stump(3260, 7, 3),
      boulder(3520, 6, 2),
      log(3720, 8, 4),
      branch(3960, 5, 2),
    ],
    movingPlatforms: [
      movingPlatform(1140, 7, 110, 55, 2, 0, { kind: 'log' }),
      // Lift vertikal menuju sarang lalat.
      movingPlatform(2500, 6, 90, 50, 2, 2.5, { axis: 'vertical', kind: 'log' }),
      movingPlatform(3140, 7, 130, 60, 2, 4, { kind: 'log' }),
      movingPlatform(3620, 5, 100, 48, 2, 1, { axis: 'vertical', kind: 'branch' }),
    ],
    // Dua batang tumbang tergantung berlawanan fase: menyeberang berarti membaca
    // ayunannya, bukan menekan lompat lebih cepat.
    swayingLogs: [
      swayingLog(1800, 2, 155, 96, 24, 1.0, 0),
      swayingLog(1960, 2, 155, 96, 24, 1.0, Math.PI),
    ],
    // Ular menggantung dan berayun di jalur bawah. Tidak pernah mengejar — ini
    // teka-teki waktu, bukan pertarungan.
    hangingSnakes: [
      hangingSnake(880, 3, 230, 30, 1.25, 0),
      hangingSnake(2760, 3, 225, 34, 1.05, 1.4),
      hangingSnake(3320, 3, 235, 28, 1.45, 0.5),
    ],
    // Rawa memperlambat 30%. Selalu ada jalur kering di atasnya, jadi lumpur
    // adalah pilihan risiko-imbalan, bukan hukuman.
    mudPatches: [
      mud(760, 260),
      mud(2160, 200),
      mud(3120, 240),
    ],
    checkpoints: [
      checkpoint(1120),
      checkpoint(2280),
      checkpoint(3480),
    ],
    // Tunggul palsu, menempel persis di ujung tunggul asli di 2400-2520.
    // Tidak berkedip sama sekali — hanya ketahuan kalau pemain iseng melompat
    // di bawah tunggul yang letaknya sedikit ganjil.
    mysteryBlocks: [
      mysteryBlock(2520, 6, 'recycleVacuum', 'stump'),
    ],
    // Hutan: sisa bekal pendaki dan bungkus makanan.
    trashItems: {
      plastic: ['botolPlastik', 'kantongPlastik'],
      paper: ['kertas', 'kardus'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(200, GROUND_Y - 30, 'organic'),
      trash(360, ROW(8) - 20, 'paper'),
      trash(600, ROW(6) - 20, 'organic'),
      // Jalur kering vs jalur lumpur: dua sampah, dua tingkat risiko.
      trash(840, ROW(7) - 20, 'glass'),
      trash(880, GROUND_Y - 30, 'plastic'),
      trash(1060, ROW(5) - 20, 'paper'),
      trash(1200, ROW(7) - 20, 'metal'),
      // Hanya bisa diambil sambil menumpang platform bergerak.
      trash(1300, ROW(7) - 20, 'organic'),
      trash(1470, ROW(5) - 20, 'glass'),
      // Di atas batang bergoyang — terlalu tinggi untuk lompatan dari tanah.
      trash(1880, 175, 'plastic'),
      trash(2040, 175, 'paper'),
      trash(2660, ROW(4) - 20, 'metal'),
      trash(2860, ROW(7) - 20, 'glass'),
      trash(3060, ROW(5) - 20, 'organic'),
      trash(3300, GROUND_Y - 30, 'plastic'),
      trash(3560, ROW(6) - 20, 'metal'),
      trash(3800, ROW(8) - 20, 'paper'),
      trash(4000, ROW(5) - 20, 'glass'),
    ],
    secrets: [
      secret(640, ROW(6) - 50, 'maggot'),
      secret(1960, 130, 'compost'),
      secret(2740, ROW(4) - 50, 'maggot'),
      secret(3620, ROW(5) - 50, 'compost'),
    ],
    // Enam pejalan, bukan sepuluh. Kesulitan datang dari kombinasi rawa, ular,
    // dan pijakan bergerak — bukan dari menumpuk musuh.
    enemies: [
      enemy(480, 90),
      enemy(1250, 110),
      enemy(1660, 90),
      enemy(2430, 100),
      enemy(3040, 110),
      enemy(3760, 100),
    ],
    flyingEnemies: [
      flyingEnemy(1470, ROW(4) - 30, 45, 24, 60),
      flyingEnemy(2650, ROW(4) - 30, 50, 25, 65),
      flyingEnemy(2860, ROW(5) - 30, 60, 30, 70),
      flyingEnemy(3060, ROW(4) - 30, 55, 28, 68),
    ],
    giantFlies: [
      giantFly(700, 5, 70, 30, 55),
      // Menekan pemain tepat saat mereka berdiri di batang bergoyang.
      giantFly(1900, 3, 80, 32, 58),
      giantFly(2740, 4, 90, 34, 62),
      giantFly(2960, 5, 80, 30, 60),
    ],
    healthPickups: [
      healthPickup(1140, GROUND_Y - 120),
      healthPickup(2400, ROW(6) - 20),
      healthPickup(3480, GROUND_Y - 120),
    ],
    boosts: [
      boost(1020, ROW(5) - 30, 'jump'),
      // Hadiah bagi yang berani menerjang lumpur.
      boost(2200, GROUND_Y - 40, 'shield'),
      boost(3400, ROW(8) - 30, 'magnet'),
    ],
    goal: { x: 4050, y: GROUND_Y },

    story: {
      intro:
        'Pohon Kehidupan: "Hutan ini dulu sarana kehidupan ribuan spesies. Kini pohon ditebang dan ikan mati. Kembalikan hutan!"',
      outro:
        'Hutan kembali ramai! Daun bergoyang ditiup angin, ekosistem pulih, dan suara kicau burung kembali mengisi udara.',
    },
    fact: {
      title: 'Hutan Tropis',
      text: 'Hutan tropis menyimpan 80% spesies bumi! Penebangan pohon merusak habitat dan mempercepat perubahan iklim.',
      tip: 'Kurangi kertas, beli produk bukan dari bahan bakar fosil, dan dukung reboisasi.',
    },
    // Naik dari 90s: rawa memperlambat langkah dan batang bergoyang harus
    // ditunggu, jadi target waktu lama menghukum bermain hati-hati.
    timeTarget: 115000,
  },
  {
    id: 6,
    name: 'Puncak Mendung',
    subtitle: 'Kabut, petir, dan longsor — lalu hadapi Raja Polusi!',
    theme: 'mountain',
    width: 4900,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    // Tebing batu: pijakan sempit di jalur berisiko, lebar di jalur aman.
    platforms: [
      boulder(280, 8, 2),
      boulder(520, 6, 2),
      // ── Percabangan 1 (x 700-1500) ──────────────────────────
      // Jalur AMAN: dua batu lebar di baris 8.
      boulder(760, 8, 3),
      boulder(1120, 8, 3),
      // Jalur SULIT: rak sempit tinggi di baris 4-5, di jalur petir.
      boulder(820, 4, 1),
      boulder(1000, 3, 1),
      boulder(1180, 4, 1),
      // ── Air terjun (x 1500-1800) ────────────────────────────
      boulder(1520, 7, 2),
      boulder(1760, 6, 2),
      // ── Percabangan 2 (x 2000-2900) ─────────────────────────
      boulder(2000, 8, 3),
      boulder(2380, 7, 2),
      boulder(2700, 8, 3),
      // Jalur SULIT: punggungan tinggi lewat sarang burung.
      boulder(2100, 4, 1),
      boulder(2300, 3, 1),
      boulder(2520, 4, 1),
      // ── Lereng longsor (x 3000-3700) ────────────────────────
      boulder(3020, 6, 2),
      boulder(3320, 5, 2),
      boulder(3600, 7, 2),
      // ── Menuju arena (x 3800-4200) ──────────────────────────
      boulder(3860, 6, 2),
      boulder(4120, 8, 3),
      // Arena Raja Polusi: dua tempat berlindung dari bola polusi.
      boulder(4420, 5, 2),
      boulder(4700, 6, 2),
    ],
    // Naik-turun: satu di air terjun, satu di lereng longsor, satu di arena.
    movingPlatforms: [
      movingPlatform(1620, 6, 90, 46, 2, 0, { axis: 'vertical', kind: 'boulder' }),
      movingPlatform(2180, 7, 120, 58, 2, 2, { kind: 'boulder' }),
      movingPlatform(3180, 5, 100, 50, 2, 1.4, { axis: 'vertical', kind: 'boulder' }),
      movingPlatform(4260, 6, 110, 62, 2, 3, { kind: 'boulder' }),
    ],
    // Rak yang runtuh: semuanya di jalur berisiko, tidak pernah di jalur aman.
    crumblingRocks: [
      crumbleRock(900, 4, 2),
      crumbleRock(1080, 3, 2),
      crumbleRock(2200, 4, 2),
      crumbleRock(2400, 3, 2),
      crumbleRock(3420, 5, 2),
      crumbleRock(3740, 6, 2),
    ],
    // Kolom petir hanya di jalur sulit dan di lereng longsor.
    lightningZones: [
      lightning(940, 90, 4200, 0),
      lightning(1160, 90, 4600, 1500),
      lightning(2320, 90, 4400, 800),
      lightning(3480, 100, 3800, 2200),
    ],
    // Longsoran menggelinding menuruni lereng ke arah pemain.
    rollingBoulders: [
      rollingBoulder(3760, -1, 250, 760, 5200, 0),
      rollingBoulder(3760, -1, 300, 780, 6100, 2600),
      rollingBoulder(2960, -1, 235, 620, 5600, 1400),
    ],
    // Sampah bisa disembunyikan di balik tirai airnya.
    waterfalls: [
      waterfall(1600, 0, 3, 8),
      waterfall(3560, 0, 2, 7),
    ],
    // Jangkauan harus melebihi jarak sarang ke tanah (~300px di baris 2),
    // kalau tidak burung tidak pernah menyambar pemain yang lewat di bawah.
    trashBirds: [
      trashBird(1040, 2, 340),
      trashBird(2340, 2, 340),
      trashBird(3320, 3, 320),
      trashBird(4080, 3, 320),
    ],
    // Kabut menutup sebagian layar tiap ~11 detik selama 4 detik.
    fog: { intervalMs: 11000, durationMs: 4000, coverage: 0.46 },
    checkpoints: [
      checkpoint(1500),
      checkpoint(2900),
      checkpoint(3900),
    ],
    // Batu palsu di tepi arena — tersamar di antara bebatuan asli.
    mysteryBlocks: [
      mysteryBlock(4180, 5, 'ecoVest', 'boulder'),
    ],
    // Pegunungan: bekal logistik pendakian.
    trashItems: {
      plastic: ['botolPlastik', 'gelasPlastik'],
      paper: ['kertas', 'kardus'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(200, GROUND_Y - 30, 'plastic'),
      trash(320, ROW(8) - 20, 'paper'),
      trash(560, ROW(6) - 20, 'metal'),
      // Jalur aman: dua sampah biasa.
      trash(800, ROW(8) - 20, 'organic'),
      trash(1160, ROW(8) - 20, 'plastic'),
      // Jalur sulit: empat sampah di rak sempit dalam kolom petir.
      trash(840, ROW(4) - 20, 'glass'),
      trash(940, ROW(4) - 20, 'metal'),
      trash(1020, ROW(3) - 20, 'paper'),
      trash(1200, ROW(4) - 20, 'glass'),
      // Di balik tirai air terjun.
      trash(1660, ROW(3) - 20, 'plastic'),
      trash(1690, ROW(5) - 20, 'metal'),
      trash(1800, ROW(6) - 20, 'organic'),
      trash(2050, ROW(8) - 20, 'paper'),
      // Punggungan sarang burung.
      trash(2130, ROW(4) - 20, 'glass'),
      trash(2330, ROW(3) - 20, 'metal'),
      trash(2560, ROW(4) - 20, 'plastic'),
      trash(2740, ROW(8) - 20, 'organic'),
      // Jalur longsoran — diambil sambil menghindari batu menggelinding.
      trash(3060, ROW(6) - 20, 'paper'),
      trash(3200, GROUND_Y - 30, 'metal'),
      trash(3360, ROW(5) - 20, 'glass'),
      trash(3620, ROW(7) - 20, 'plastic'),
      trash(3900, ROW(6) - 20, 'organic'),
      trash(4160, ROW(8) - 20, 'paper'),
    ],
    secrets: [
      // Hadiah jalur sulit.
      secret(1020, ROW(3) - 50, 'maggot'),
      // Benar-benar di balik air terjun.
      secret(1680, ROW(2) - 20, 'compost'),
      secret(2330, ROW(3) - 50, 'maggot'),
      secret(3480, ROW(5) - 50, 'compost'),
    ],
    // Delapan pejalan di 4900px — lebih longgar dari level 5 karena tekanan
    // datang dari petir, longsor, kabut, dan rak yang runtuh.
    enemies: [
      enemy(420, 100),
      enemy(900, 110),
      enemy(1400, 100),
      enemy(1900, 110),
      enemy(2600, 100),
      enemy(3120, 110),
      enemy(3700, 100),
      enemy(4020, 110),
    ],
    flyingEnemies: [
      flyingEnemy(1300, ROW(6) - 30, 55, 30, 70),
      flyingEnemy(2450, ROW(6) - 30, 60, 32, 72),
      flyingEnemy(3300, ROW(6) - 30, 55, 30, 68),
    ],
    pollutionBoss: {
      name: 'Raja Polusi',
      x: 4560,
      y: 150,
      arenaStart: 4300,
      arenaEnd: 4860,
      hp: 3,
    },
    healthPickups: [
      healthPickup(1500, GROUND_Y - 120),
      healthPickup(2900, GROUND_Y - 120),
      healthPickup(3900, GROUND_Y - 120),
      healthPickup(4340, ROW(5) - 20),
    ],
    boosts: [
      // Bonus jalur sulit.
      boost(1020, ROW(3) - 60, 'shield'),
      boost(2330, ROW(3) - 60, 'jump'),
      boost(3480, ROW(5) - 60, 'magnet'),
    ],
    goal: { x: 4860, y: GROUND_Y },

    story: {
      intro:
        'Pohon Kehidupan: "Puncak gunung adalah sumber mata air, tetapi kini diselimuti kabut dan petir. Di atas sana bertahta Raja Polusi — awan hitam raksasa. Jangan tabrak dia; kumpulkan Eco Energy Orb dan tembak intinya dengan Eco Blaster!"',
      outro:
        'Awan hitam pecah menjadi awan putih! Matahari muncul, kabut hilang, burung-burung kembali terbang, dan bunga bermekaran di sepanjang punggungan. Puncak kembali menjadi pemandangan pegunungan yang bersih.',
    },
    fact: {
      title: 'Mata Air dan Ekosistem',
      text: 'Hutan pegunungan menyimpan air bersih untuk kota bawah. Sampah di puncak bisa menyebar ke hilir dan bahayakan kesehatan jutaan orang.',
      tip: 'Jangan buang limbah, jaga bukit, dan tanam pohon di lahan kritis pegunungan.',
    },
    // Kabut, jeda petir, dan menunggu rak runtuh pulih membuat level ini lebih
    // lambat dari level 5 meski panjangnya mirip.
    timeTarget: 150000,
  },
  {
    id: 7,
    name: 'Kota Berdengung',
    subtitle: 'Bersihkan polusi dari jalanan!',
    theme: 'city',
    width: 4800,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    platforms: [
      brick(350, 8, 3),
      brick(650, 6, 2),
      brick(900, 8, 3),
      brick(1200, 5, 2),
      brick(1450, 7, 3),
      brick(1750, 5, 2),
      brick(2000, 8, 3),
      brick(2300, 6, 2),
      brick(2550, 8, 3),
      brick(2850, 5, 2),
      brick(3100, 7, 3),
      brick(3400, 5, 2),
      brick(3650, 8, 3),
      brick(3950, 6, 2),
      brick(4200, 8, 3),
      brick(4450, 5, 2),
    ],
    movingPlatforms: [
      movingPlatform(500, 7, 70, 60, 2, 0),
      movingPlatform(1050, 7, 80, 55, 2, 2),
      movingPlatform(1650, 7, 60, 70, 2, 4),
      movingPlatform(2350, 7, 90, 65, 2, 1),
      movingPlatform(2950, 7, 70, 75, 2, 3),
      movingPlatform(3550, 7, 80, 60, 2, 5),
      movingPlatform(4100, 7, 60, 70, 2, 0),
    ],
    // Kota: kardus paket dan gelas minuman kemasan.
    trashItems: {
      plastic: ['gelasPlastik', 'kantongPlastik', 'botolPlastik'],
      paper: ['kardus', 'kertas'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(200, GROUND_Y - 30, 'plastic'),
      trash(450, ROW(8) - 20, 'paper'),
      trash(700, ROW(6) - 20, 'metal'),
      trash(950, ROW(8) - 20, 'glass'),
      trash(1250, ROW(5) - 20, 'organic'),
      trash(1500, ROW(7) - 20, 'plastic'),
      trash(1850, ROW(5) - 20, 'paper'),
      trash(2100, ROW(8) - 20, 'metal'),
      trash(2400, ROW(6) - 20, 'glass'),
      trash(2650, ROW(8) - 20, 'plastic'),
      trash(2950, ROW(5) - 20, 'organic'),
      trash(3200, ROW(7) - 20, 'paper'),
      trash(3500, ROW(5) - 20, 'metal'),
      trash(3800, ROW(8) - 20, 'glass'),
      trash(4050, ROW(6) - 20, 'plastic'),
      trash(4300, ROW(8) - 20, 'paper'),
      trash(4550, GROUND_Y - 30, 'organic'),
      // Dead phone batteries dumped on a city street.
      hazardTrash(1900, GROUND_Y - 30),
    ],
    secrets: [
      secret(550, ROW(6) - 50, 'maggot'),
      secret(1150, ROW(7) - 50, 'compost'),
      secret(2500, ROW(7) - 50, 'maggot'),
      secret(3150, ROW(7) - 50, 'compost'),
      secret(3800, ROW(7) - 50, 'maggot'),
      secret(4300, ROW(7) - 50, 'compost'),
    ],
    enemies: [
      enemy(450, 100),
      enemy(800, 120),
      enemy(1050, 100),
      enemy(1400, 120),
      enemy(1800, 100),
      enemy(2150, 120),
      enemy(2450, 100),
      enemy(2700, 120),
      enemy(3000, 100),
      enemy(3250, 120),
      enemy(3500, 100),
      enemy(3800, 120),
      enemy(4050, 100),
      enemy(4350, 120),
    ],
    flyingEnemies: [
      flyingEnemy(600, ROW(5) - 30, 50, 35, 70),
      flyingEnemy(1350, ROW(5) - 30, 50, 30, 75),
      flyingEnemy(2300, ROW(5) - 30, 60, 40, 70),
      flyingEnemy(3350, ROW(5) - 30, 50, 35, 80),
      flyingEnemy(4150, ROW(5) - 30, 60, 30, 75),
    ],
    healthPickups: [
      healthPickup(700, ROW(5) - 20),
      healthPickup(1900, GROUND_Y - 120),
      healthPickup(3150, ROW(6) - 20),
      healthPickup(4400, GROUND_Y - 120),
    ],
    boosts: [
      boost(650, ROW(8) - 30, 'magnet'),
      boost(1550, ROW(7) - 30, 'shield'),
      boost(2700, ROW(8) - 30, 'jump'),
      boost(3900, ROW(6) - 30, 'magnet'),
      boost(4500, ROW(5) - 30, 'shield'),
    ],
    goal: { x: 4650, y: GROUND_Y },
    story: {
      intro:
        'Pohon Kehidupan: "Kota adalah jantung peradaban, tapi juga sumber polusi terbesar. Bersihkan jalanan, bangun kembali ekosistem urban!"',
      outro:
        'Kota kembali segar! Udara bersih, jalanan hijau, dan orang-orang kembali peduli lingkungan. Kota model baru lahir!',
    },
    fact: {
      title: 'Kota Ramah Alam',
      text: '70% emisi karbon dunia berasal dari perkotaan. Kota ramah alam mengurangi polusi hingga 60% dengan transportasi hijau dan hijauisasi.',
      tip: 'Naik sepeda, praktikkan 3R (reduce, reuse, recycle), dan dukung policy kota hijau.',
    },
    timeTarget: 90000,
  },
  {
    id: 8,
    name: 'Samudra Murni',
    subtitle: 'Selamatkan samudra dari sampah plastik!',
    theme: 'ocean',
    width: 5200,
    playerStart: { x: 80, y: GROUND_Y - 60 },
    platforms: [
      brick(350, 8, 3),
      brick(650, 6, 2),
      brick(900, 8, 3),
      brick(1200, 5, 2),
      brick(1450, 7, 3),
      brick(1750, 5, 2),
      brick(2000, 8, 3),
      brick(2300, 6, 2),
      brick(2550, 8, 3),
      brick(2850, 5, 2),
      brick(3100, 7, 3),
      brick(3400, 5, 2),
      brick(3650, 8, 3),
      brick(3950, 6, 2),
      brick(4200, 8, 3),
      brick(4450, 5, 2),
      brick(4700, 7, 3),
      brick(4950, 5, 2),
    ],
    movingPlatforms: [
      movingPlatform(500, 7, 70, 65, 2, 0),
      movingPlatform(1000, 7, 80, 55, 2, 2),
      movingPlatform(1600, 7, 70, 70, 2, 4),
      movingPlatform(2250, 7, 90, 60, 2, 1),
      movingPlatform(2950, 7, 80, 75, 2, 3),
      movingPlatform(3600, 7, 70, 65, 2, 5),
      movingPlatform(4250, 7, 90, 70, 2, 0),
      movingPlatform(4800, 7, 80, 55, 2, 2),
    ],
    // Samudra: plastik sekali pakai yang paling mematikan bagi biota laut.
    trashItems: {
      plastic: ['kantongPlastik', 'botolPlastik', 'gelasPlastik'],
      paper: ['kardus'],
      organic: ['organik'],
      metal: ['kaleng'],
      glass: ['botolKaca'],
    },
    trash: [
      trash(200, GROUND_Y - 30, 'glass'),
      trash(450, ROW(8) - 20, 'plastic'),
      trash(700, ROW(6) - 20, 'paper'),
      trash(950, ROW(8) - 20, 'organic'),
      trash(1250, ROW(5) - 20, 'metal'),
      trash(1500, ROW(7) - 20, 'glass'),
      trash(1850, ROW(5) - 20, 'plastic'),
      trash(2100, ROW(8) - 20, 'paper'),
      trash(2400, ROW(6) - 20, 'organic'),
      trash(2650, ROW(8) - 20, 'metal'),
      trash(2950, ROW(5) - 20, 'glass'),
      trash(3200, ROW(7) - 20, 'plastic'),
      trash(3500, ROW(5) - 20, 'paper'),
      trash(3800, ROW(8) - 20, 'organic'),
      trash(4050, ROW(6) - 20, 'metal'),
      trash(4300, ROW(8) - 20, 'glass'),
      trash(4550, ROW(5) - 20, 'plastic'),
      trash(4850, ROW(7) - 20, 'paper'),
    ],
    secrets: [
      secret(550, ROW(6) - 50, 'maggot'),
      secret(1250, ROW(7) - 50, 'compost'),
      secret(2050, ROW(8) - 50, 'maggot'),
      secret(2800, ROW(7) - 50, 'compost'),
      secret(3550, ROW(8) - 50, 'maggot'),
      secret(4350, ROW(8) - 50, 'compost'),
      secret(4850, ROW(7) - 50, 'maggot'),
    ],
    enemies: [
      enemy(450, 100),
      enemy(800, 120),
      enemy(1100, 100),
      enemy(1500, 120),
      enemy(1900, 100),
      enemy(2200, 120),
      enemy(2500, 100),
      enemy(2750, 120),
      enemy(3000, 100),
      enemy(3250, 120),
      enemy(3550, 100),
      enemy(3800, 120),
      enemy(4100, 100),
      enemy(4350, 120),
    ],
    flyingEnemies: [
      flyingEnemy(650, ROW(5) - 30, 50, 35, 70),
      flyingEnemy(1350, ROW(5) - 30, 50, 40, 75),
      flyingEnemy(2150, ROW(5) - 30, 60, 30, 80),
      flyingEnemy(2950, ROW(5) - 30, 50, 35, 70),
      flyingEnemy(3700, ROW(5) - 30, 60, 30, 75),
      flyingEnemy(4450, ROW(5) - 30, 50, 40, 80),
    ],
    healthPickups: [
      healthPickup(650, ROW(5) - 20),
      healthPickup(1750, GROUND_Y - 120),
      healthPickup(3100, ROW(6) - 20),
      healthPickup(4200, GROUND_Y - 120),
    ],
    boosts: [
      boost(450, ROW(8) - 30, 'jump'),
      boost(1100, ROW(5) - 30, 'shield'),
      boost(1900, ROW(5) - 30, 'magnet'),
      boost(2850, ROW(5) - 30, 'jump'),
      boost(3700, ROW(5) - 30, 'shield'),
      boost(4650, GROUND_Y - 40, 'magnet'),
    ],
    goal: { x: 5000, y: GROUND_Y },
    story: {
      intro:
        'Pohon Kehidupan: "Samudra ini dulu biru jernih, kini menghitam karena polusi plastik. Kura-kura terancam. Ayo selamatkan samudra!"',
      outro:
        'Samudra kembali biru! Ikan-ikan berenang bebas, terumbu karang tumbuh indah, dan samudra menjadi kapal perang polusi!',
    },
    fact: {
      title: 'Polusi Plastik di Laut',
      text: 'Setiap tahun 8 juta ton plastik masuk ke laut! Plastik membunuh 100.000 mamalia laut dan 1 juta burung laut.',
      tip: 'Gunakan wadah daur ulang, kurangkan kemasan sekali pakai, dan jangan buang sampah ke selokan.',
    },
    timeTarget: 105000,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_trash',
    name: 'Pemulung Pertama',
    description: 'Kumpulkan sampah pertamamu',
    icon: 'recycle',
    condition: (s) => s.trashCollected >= 1,
  },
  {
    id: 'first_enemy',
    name: 'Pemberani',
    description: 'Kalahkan musuh pertama',
    icon: 'swords',
    condition: (s) => s.enemiesDefeated >= 1,
  },
  {
    id: 'first_flying',
    name: 'Pemburu Udara',
    description: 'Kalahkan musuh terbang pertama',
    icon: 'plane',
    condition: (s) => s.flyingEnemiesDefeated >= 1,
  },
  {
    id: 'first_boost',
    name: 'Pelari Berkilau',
    description: 'Mengambil boost pertama',
    icon: 'zap',
    condition: () => false,
  },
  {
    id: 'first_secret',
    name: 'Penemu Rahasia',
    description: 'Temukan bonus rahasia pertama',
    icon: 'sparkles',
    condition: (s) => s.secretsFound >= 1,
  },
  {
    id: 'combo_5',
    name: 'Kombo 5x',
    description: 'Capai kombo 5x berturut-turut',
    icon: 'flame',
    condition: (s) => s.combo >= 5,
  },
  {
    id: 'combo_8',
    name: 'Kombo Perfect',
    description: 'Capai kombo 8x berturut-turut',
    icon: 'flame',
    condition: (s) => s.combo >= 8,
  },
  {
    id: 'ten_trash',
    name: 'Pembersih Sampah',
    description: 'Kumpulkan 10 sampah',
    icon: 'trash',
    condition: (s) => s.trashCollected >= 10,
  },
  {
    id: 'all_flying',
    name: 'Sempurna!',
    description: 'Kumpulkan semua sampah di level',
    icon: 'award',
    condition: (s) => s.trashCollected >= 13,
  },
  {
    id: 'five_enemies',
    name: 'Pejuang Polusi',
    description: 'Kalahkan 5 musuh polusi',
    icon: 'shield',
    condition: (s) => s.enemiesDefeated >= 5,
  },
  {
    id: 'three_secrets',
    name: 'Pemburu Bonus',
    description: 'Temukan 3 bonus rahasia',
    icon: 'gem',
    condition: (s) => s.secretsFound >= 3,
  },
  {
    id: 'no_damage',
    name: 'Tak Terkalahkan',
    description: 'Selesaikan level tanpa kehilangan nyawa',
    icon: 'heart',
    condition: (s) => s.lives >= 3 && s.currentLevel > 1,
  },
  {
    id: 'score_1000',
    name: 'Skor 1000',
    description: 'Raih skor 1000',
    icon: 'star',
    condition: (s) => s.score >= 1000,
  },
  {
    id: 'score_3000',
    name: 'Skor 3000',
    description: 'Raih skor 3000',
    icon: 'crown',
    condition: (s) => s.score >= 3000,
  },
  {
    id: 'score_5000',
    name: 'Skor 5000',
    description: 'Raih skor 5000',
    icon: 'trophy',
    condition: (s) => s.score >= 5000,
  },
  {
    id: 'all_trash_level',
    name: 'Sempurna!',
    description: 'Kumpulkan semua sampah di level',
    icon: 'award',
    condition: (s) => s.trashCollected >= 13,
  },
];
