import { PR, T } from '../interior.js';
import { homes } from './homes.js';
import { shops } from './shops.js';

const CLEAR = 2 * PR * 1.3;
const WIDTH = CLEAR + 2 * T;
const HALF = WIDTH / 2;
const H = 2.38;
const sign = (text, x, z, rot, c = '#dbcfae') => ['sign', x, z, rot, { text, c, h: 0.24, y: 1.91, k: 1.4 }];
const panel = (tile, x, z, rot, w, h, y) => ['havenPanel', x, z, rot, { tile, w, h, y }];
const pipe = (x, z, y, len, c, radius) => ['havenPipe', x, z, 0, { y, len, c, radius }];
const term = (label, use, x, z, rot, kind) => ['terminal', x, z, rot, { label, use, kind }];
const fit = (x, z, rot, w, d, h, c) => ['havenFitting', x, z, rot, { w, d, h, c }];

// Metres along the unwrapped deck of the ring. Each entry specifies both bends,
// the primary and auxiliary finishes, and the actual fittings above clear height.
// The short return passages close the different lateral positions of these streets.
const streets = [
  [0,58,-3,'保税柵通路',[18,19,20],2.38,'#ffe8bc','tube',[sign('A01  到着口',1.7,0.22,0),pipe(17.7,0.33,2.22,12.1,0x7f7460),panel(322,14.3,0.215,0,0.52,0.31,1.42),sign('保税検査済   ►',32.5,1.09,2),panel(323,49.8,1.096,2,0.74,0.24,1.61)]],
  [58,131,2,'荷札坂',[21,22,23],2.44,'#e5e7c8','panel',[panel(324,3.1,0.215,0,0.48,0.43,1.42),sign('潮目交易所',37.42,0.22,0,'#eed49b'),pipe(58,0.94,2.25,15.9,0x847870),pipe(51,1.00,2.15,6.7,0x797f75)]],
  [131,188,-6,'継ぎ板通路',[24,25,26],2.34,'#e5ded0','spot',[panel(325,7.62,1.096,2,0.56,0.33,1.47),pipe(18.6,0.41,2.2,16.35,0x784734),sign('折返し  右',54.6,0.22,0,'#d8c6ab')]],
  [188,254,1,'粉舟通路',[27,28,29],2.41,'#ffddaf','tube',[pipe(13.51,0.38,2.19,8.2,0xbe8f67),sign('焼き上がり  09:20 / 21:00',28.5,0.22,0,'#ffbd85'),panel(326,35.75,1.096,2,0.45,0.30,1.55),pipe(56.4,1.03,2.27,11.33,0x979181)]],
  [254,323,6,'引込線通路',[30,31,32],2.36,'#e7d7aa','tube',[panel(327,13.8,0.216,0,0.7,0.36,1.46),sign('船具・機体整備',33.4,1.09,2,'#eac49a'),pipe(43.2,0.29,2.1,27.8,0x687569),pipe(51.22,0.43,2.24,24.77,0x747466)]],
  [323,378,-2,'東水栓通路',[33,34,35],2.48,'#e0e9d2','strip',[pipe(9.8,1.02,2.29,16.6,0x648f9b),panel(328,15.1,1.096,2,0.58,0.27,1.52),sign('水圧 0.31 MPa',32.7,0.23,0,'#d4e1df'),pipe(43.3,0.35,2.25,18.4,0x679495)]],
  [378,448,4,'眠り班通路',[36,37,38],2.29,'#f4c7a0','spot',[sign('住戸前  静かに',3.1,1.09,2,'#ecd0aa'),panel(329,16.6,0.215,0,0.33,0.4,1.54),sign('カフェ・テラ',38.3,0.22,0,'#f1c99b'),pipe(52.6,0.36,2.19,14.4,0xb3805f)]],
  [448,506,-4,'青銅棚通路',[39,40,41],2.39,'#e1e8ea','tube',[pipe(10,0.34,2.19,8.1,0xa27459),panel(330,15.55,1.096,2,0.54,0.34,1.49),sign('洗濯室  9–22',42.43,0.22,0,'#c6dde6'),pipe(50,1.03,2.22,10.1,0x6e7e86)]],
  [506,572,0,'裏水路',[42,43,44],2.37,'#d4e7d4','strip',[panel(331,9.7,1.096,2,0.51,0.34,1.40),pipe(23.5,0.31,2.14,35,0x638a73),pipe(28.5,1.03,2.08,25,0x886951),sign('点検用床板',54,0.22,0)]],
  [572,624,8,'真鍮リレー通路',[45,46,47],2.42,'#ffe2a8','panel',[panel(332,11.67,0.215,0,0.42,0.39,1.52),pipe(18.9,0.28,2.26,31.2,0x9f7556),pipe(22.4,0.45,2.16,14.2,0xc49764),sign('高圧リレー室 ►',46.3,1.09,2,'#ffd68a')]],
  [624,690,2,'藻場前通路',[48,49,50],2.35,'#e2edbc','spot',[panel(333,13.5,1.096,2,0.66,0.36,1.45),sign('灌水は夜間',25.7,0.22,0,'#dce8aa'),pipe(43.6,0.94,2.18,31.4,0x88a875)]],
  [690,748,-5,'瓶底通路',[51,52,53],2.31,'#e8c7ba','tube',[panel(334,7.71,1.096,2,0.46,0.39,1.29),pipe(29.1,0.38,2.11,18.25,0xa39782),sign('返却瓶は各戸へ',48.8,0.22,0,'#d9d2b3')]],
  [748,824,5,'包丁研ぎ通路',[54,55,56],2.5,'#f4e2bc','tube',[panel(335,22.61,1.096,2,0.6,0.35,1.39),sign('夕刊きいろ',31.2,1.09,2,'#f2d688'),pipe(53.3,0.35,2.32,9.4,0x7c7f79),panel(336,69.27,0.215,0,0.6,0.29,1.57)]],
  [824,879,-1,'布団棚通路',[57,58,59],2.28,'#dcc9b6','spot',[sign('消灯  22時',6.87,0.22,0,'#e6c4a2'),panel(337,22.44,0.215,0,0.46,0.36,1.45),pipe(38.4,0.36,2.14,16.1,0x967565)]],
  [879,944,7,'静脈弁通路',[60,61,62],2.43,'#e3e8cb','panel',[pipe(23.7,0.41,2.18,39.1,0x647b65),pipe(22.4,0.84,2.27,11.2,0x777458),panel(338,40.6,1.096,2,0.39,0.43,1.37),sign('隔離弁  H3',57.2,0.22,0,'#c4d8b7')]],
  [944,1002,3,'繕い戸通路',[63,64,65],2.39,'#ffe2bd','tube',[panel(339,10.2,1.096,2,0.62,0.25,1.36),pipe(24.7,0.49,2.24,15.7,0x987b62),sign('仕立物  預かり口',43.31,1.09,2,'#f2cb9d')]],
  [1002,1073,-4,'茶釜脇通路',[66,67,68],2.41,'#ffdfa8','spot',[panel(340,12.91,1.096,2,0.58,0.34,1.44),sign('三煎茶舗',30.46,1.09,2,'#e9c98c'),pipe(53.77,0.37,2.18,24.1,0x88806b)]],
  [1073,1126,5,'栽培枠通路',[69,70,71],2.36,'#e8efbd','tube',[pipe(15.5,0.34,2.18,12.9,0x7f9770),sign('種の店  葉裏',38.08,1.09,2,'#e3ebae'),pipe(38.7,1.04,2.27,19.5,0x637e5e)]],
  [1126,1191,-2,'白弁通路',[72,73,74],2.47,'#ecf0dd','panel',[sign('白弁薬房',24.4,1.09,2,'#d6f4e1'),panel(341,29.97,0.215,0,0.55,0.3,1.54),pipe(45.3,0.4,2.26,26.0,0x90938c)]],
  [1191,1251,6,'南見張窓通路',[75,76,77],2.34,'#d5e5f7','strip',[pipe(9.9,1.00,2.19,17.25,0x777c9f),sign('下段舷窓  B',22.05,0.22,0,'#bcd0ec'),pipe(43.48,0.32,2.19,12.29,0x605d73)]],
  [1251,1326,0,'結露帯通路',[78,79,80],2.32,'#e2d8bf','spot',[pipe(12.33,0.32,2.18,22.1,0x9a876f,0.052),pipe(21.7,1.03,2.16,30.2,0x788d8a),sign('結露  足元注意',39.74,0.22,0,'#efcc83'),pipe(57.1,0.41,2.15,17,0x8b856a)]],
  [1326,1384,-7,'遮光板通路',[81,82,83],2.46,'#dfe7fd','tube',[sign('レンズ研磨',29.85,0.22,0,'#cbe0ff'),pipe(8.1,1.03,2.26,9.9,0x67657c),pipe(45.43,0.37,2.23,16.85,0x728f9e)]],
  [1384,1439,2,'差出棚通路',[84,85,86],2.39,'#f4dfbe','panel',[sign('地球行き郵便',17.3,0.22,0,'#c8e1b9'),pipe(22.1,0.35,2.23,13.65,0x7f7d63),pipe(36.8,1.0,2.2,12.4,0x897973),sign('この先  監視区画',50.8,1.09,2)]],
  [1439,1500,-3,'後部点検通路',[87,88,89],2.41,'#dfe1d8','spot',[pipe(15.85,0.33,2.23,24.15,0x778a7b),pipe(41.61,0.97,2.12,21.2,0x98795d),sign('終端隔離弁  END',57,1.09,2,'#f6ba91')]],
];

// Some fixtures are missing in occupied or recently repaired sections.
const lightPositions = [
  [2.7,10.3,19.5,29.8,36.7,47.4,54.6], [4.7,18.3,25.8,32.2,41.8,51.4,60,67.3],
  [1.9,7.8,17.8,27.2,40.1,51.6], [4.1,12.6,21.4,27.6,36.8,44.1,50.9,60.3],
  [3.3,13.8,21.7,31.5,44.6,50.3,60.6], [4.35,12.7,20.5,35.3,45.6,51.5],
  [2.91,15.6,23.4,35.7,40.3,53.2,62.9,66.82], [1.8,8.5,17.7,24.9,37.6,45.4,52.2],
  [5.1,11.3,22.7,29.1,41.2,50.78,58.7], [4.3,16.16,27.7,34.1,41.7,48.22],
  [3.3,13.5,23.6,31.35,40.3,52.2,60.59], [2.6,11,17.89,30.3,42.6,46.1,53.76],
  [5.25,13.6,21.2,34.96,42.2,49.1,60.3,72.2], [1.7,9.3,17.2,30.6,37.29,46.8,51.5],
  [4.6,16.7,23.63,31.2,42.6,55.2,61.3], [4.48,9.58,21.2,32.1,40.23,47,52.9],
  [2.31,12.8,19.5,29.5,37.4,45.8,58.47,67.3], [3.45,12.5,21.8,33.94,40.1,48.48],
  [6.23,13.14,22.7,30.34,41.3,54.3,59.76], [2.72,11.6,21.3,31.1,36.32,50,56.11],
  [3.21,13.2,24.66,31.5,43.2,53.4,66.8,70.3], [4.35,14.7,23.2,28.1,39.34,51.1,54.66],
  [2.4,9.95,18.3,23.2,33.2,44.3,50.13], [4.1,15.2,20.7,30.95,42.31,51.4,56.62],
];

// A return may be in a radiator shadow, beneath a valve, or behind a lit
// inspection frame. All placements are specified as-built, in world metres.
const returns = [
  [18,20,'#f7dba8','折札',0.68], [24,26,'#e4e7dc','旧保税弁',2.4],
  [27,29,'#fed3b8','配膳口跡',3.12], [30,32,'#eee8d3','みぞ蓋',1.78],
  [33,35,'#bfd9de','東給水立管',7.1], [39,38,'#f3d1ae','夜勤側',4.1],
  [42,41,'#d4d1b8','青銅の継ぎ',2.23], [45,44,'#d2e6dc','沈殿槽入口',1.78],
  [48,50,'#ddb37b','リレー迂回',4.75], [51,53,'#e0e5cc','逆止弁',3.05],
  [54,56,'#f5d4d0','洗浄枠',3.4], [57,59,'#f1c396','元食料用ハッチ',5.8],
  [60,62,'#dac8bf','保温継手',3.43], [63,65,'#cad5c4','抽気口',3.9],
  [66,68,'#ecdbd4','洗い桶跡',2.26], [69,71,'#fad5a5','熱交換の曲り',4.89],
  [72,74,'#d6e4b9','緑の減圧弁',5.2], [75,77,'#d8ebeb','消毒区画境',2.65],
  [78,80,'#e2e7f7','地球側継目',2.1], [81,83,'#c9e1e2','冷管曲り',2.97],
  [84,86,'#f1dcba','古い配線孔',3.5], [87,89,'#c4d5df','光学通路境',5.44],
  [21,23,'#f6c6a4','帰還側予備弁',2.1],
];

// Emergency walkways behind the customs residences, the bottle stores,
// and the condensation trunk reconnect to the same deck on different sides.
const bypasses = [
  { street:1, side:-1, offset:7.45, ports:[17.45,35.7], height:2.39,
    names:['保税点検口','検品区画の裏歩廊','手荷物返却口'], tiles:[[27,22,26],[18,25,32],[24,22,23]],
    light:'#eac9a8', fixtures:[pipe(8.2,0.33,2.2,11.45,0x96856b),sign('旧荷物スケール跡',13.3,1.09,2)] },
  { street:12, side:-1, offset:7.21, ports:[29.1,42.5], height:2.32,
    names:['回収瓶・南取出口','瓶底後ろの保守路','廃瓶箱横'], tiles:[[51,52,56],[42,55,53],[57,49,50]],
    light:'#e8ceb7', fixtures:[sign('運搬時のみ点灯',4.39,0.22,0,'#ddc6b8'),pipe(8.85,0.91,2.15,6.24,0xa09d88)] },
  { street:21, side:1, offset:8.03, ports:[30.06,56.3], height:2.45,
    names:['結露槽の下り口','乾燥と採水の迂回路','空気弁の上がり口'], tiles:[[60,79,80],[75,61,83],[66,76,89]],
    light:'#d1e4d2', fixtures:[pipe(13.25,0.36,2.16,22.27,0x778d8a,0.052), sign('予備採水栓',21.11,1.09,2,'#c3ddd3')] },
];

const airlock = {
  id:'arrival', name:'保税港・到着隔離室', kind:'service',
  x:-8.9, z:-5.76, w:8.9, d:5.02, h:2.64, tiles:[342,343,344], lamp:'#ecd3b2', lamps:'tube',
  props:[
    term('接舷中の自機へ','ramp',1.06,2.21,1,'data'), term('格納庫サービス','shipyard',3.08,0.91,0,'bars'),
    term('任務端末','missions',5.23,0.84,0,'graph'), term('星図','map',6.21,4.15,2,'orbit'),
    sign('HAVEN RING  A01',2.75,4.79,2,'#ffe4c0'), sign('気圧安定  ► 居住区',7.47,0.22,0,'#c0e5ce'),
    panel(345,0.22,0.86,1,0.56,0.48,1.57), panel(346,3.16,4.779,2,0.66,0.37,1.22),
    panel(347,7.62,0.217,0,0.38,0.35,1.24), panel(348,8.675,4.04,3,0.52,0.28,0.91),
    panel(349,8.675,1.48,3,0.55,0.3,1.71), panel(350,0.222,3.7,1,0.43,0.43,1.35),
    ['locker',2.75,4.42,2,{n:3}], ['crate',7.39,4.15,0,{n:2}],
    fit(4.35,3.71,0,0.67,1.46,1.14,0x8d7864),
  ],
};

const services = [
  ['リレー枝盤室',10,'n',38.2,5.82,4.63,2.94,2.64,[351,352,353],'#f2ce96',[
    ['console',3.36,0.91,0,{kind:'bars'}], fit(1.12,2.41,0,1.23,1.82,1.85,0x776953),
    ['toolcart',4.49,3.4,0], sign('真鍮ブスバー  630V',4.17,0.23,0,'#f5d4a6')]],
  ['灌水調圧室',11,'s',46.4,6.11,5.35,2.34,2.59,[354,355,356],'#d9e9c2',[
    ['tank',4.89,3.82,0,{c:'#71d9bd'}], ['console',2.14,4.34,2,{kind:'graph'}],
    fit(0.65,3.02,0,0.55,1.78,1.57,0x68847a), pipe(3.1,4.43,2.24,3.3,0x737855),
    sign('灌水専用・飲用不可',2.8,0.22,0,'#d9eea5')]],
  ['後部監視・光学室',24,'n',49.1,7.48,5.28,5.43,2.62,[357,358,359],'#dbe8ff',[
    ['console',1.72,0.9,0,{kind:'orbit'}], fit(4.8,2.2,1,2.22,0.73,1.02,0x637989),
    ['seat',2.69,2.1,0], ['wallscreen',3.52,0.31,0,{kind:'orbit',title:'外周望遠カメラ',w:2.36,h:1.01,y:1.48}],
    ['bench',1.47,4.43,2], ['plant',6.48,0.93,0,{s:0.85}], sign('終端監視盤',7.23,2.83,3,'#c7cbea')]],
  ['地球側の片窓',20,'s',18.4,5.02,4.36,2.36,2.49,[75,77,76],'#d7e6f5',[
    ['bench',0.66,2.81,1], ['seat',3.84,2.77,0], term('軌道星図','map',4.03,1.29,3,'orbit'),
    sign('地球側  0.9 G',2.43,3.13,2,'#dee6fd')],[['s',0.8,4.27,0.74,2.22]]],
];

export function haven() {
  const rooms = [airlock], doors = [];
  const runs = streets.map(([start,end,z,name,tiles,h,lamp,lamps,props], i) => {
    const x = start + (i > 0 ? HALF : 0);
    return { id:'run-' + (i + 1), kind:'passage', name, x, z:z-HALF, w:end-(i < streets.length-1 ? HALF : 0)-x,
      d:WIDTH, h, tiles, lamp, lamps, li:0.87, props, flush:true,
      lampPoints:lightPositions[i].map((x) => [x,HALF,0]) };
  });
  rooms.push(...runs);
  for (let i = 0; i < returns.length; i++) {
    const [wall,ceil,lamp,name,where] = returns[i];
    const prev = runs[i], next = runs[i + 1];
    const z = Math.min(prev.z, next.z), d = Math.abs(prev.z - next.z) + WIDTH;
    const room = { id:'return-' + (i+1), kind:'passage', name, x:prev.x+prev.w, z, w:WIDTH, d, h:H,
      tiles:[wall,prev.tiles[1],ceil], lamp, lamps:'spot', li:0.67, flush:true,
      lampPoints:[[HALF,where,0]], props:[sign(name,WIDTH-0.22,where,3,'#d9ccb1')] };
    rooms.push(room);
    doors.push([prev.id,room.id,prev.z+HALF,CLEAR,2.15,'seam'],[room.id,next.id,next.z+HALF,CLEAR,2.15,'seam']);
  }
  doors.push([airlock.id,runs[0].id,-3,CLEAR,2.12,'slide']);
  for (const bypass of bypasses) {
    const { street, side, offset, ports, height, names, tiles, light, fixtures } = bypass;
    const hall = runs[street - 1];
    const [entryX, exitX] = ports.map(x => hall.x + x);
    const wall = side < 0 ? hall.z : hall.z + hall.d;
    const loopZ = wall + side * offset - (side > 0 ? WIDTH : 0);
    const legZ = side < 0 ? loopZ + WIDTH : wall;
    const legD = side < 0 ? wall - legZ : loopZ - wall;
    const makePassage = (index, x, z, w, d, props, lampPoints) => ({
      id:'bypass-' + street + '-' + index, name:names[index], kind:'passage', x,z,w,d,h:height,
      tiles:tiles[index], flush:true, lamp:light, lamps:'spot', li:0.71, props, lampPoints,
    });
    const span = exitX - entryX + WIDTH;
    const entry = makePassage(0,entryX-HALF,legZ,WIDTH,legD,[sign(names[0],0.22,legD/2,1)],[[HALF,legD*0.37,0]]);
    const loop = makePassage(1,entryX-HALF,loopZ,span,WIDTH,fixtures,[[3.1,HALF,0],[span-3.2,HALF,0]]);
    const exit = makePassage(2,exitX-HALF,legZ,WIDTH,legD,[sign(names[2],WIDTH-0.22,legD/2,3)],[[HALF,legD*0.68,0]]);
    rooms.push(entry,loop,exit);
    doors.push(
      [hall.id,entry.id,entryX,CLEAR,2.1,'seam'], [entry.id,loop.id,entryX,CLEAR,2.12,'seam'],
      [loop.id,exit.id,exitX,CLEAR,2.13,'seam'], [exit.id,hall.id,exitX,CLEAR,2.1,'seam'],
    );
  }


  function sideRoom(id, kind, name, street, side, setback, w, d, offset, h, tiles, lamp, props, win) {
    const hall = runs[street-1], x = hall.x+setback, z = side === 'n' ? hall.z-d : hall.z+hall.d;
    const room = { id, kind, name, x, z, w, d, h, tiles, lamp, props, win,
      lamps:kind === 'shop' ? 'tube' : 'spot', li:kind === 'home' ? 0.6 : 0.94 };
    if (kind === 'home') room.lampPoints = [[offset < w/2 ? w*0.62 : w*0.37,d*0.53,0]];
    rooms.push(room);
    doors.push([hall.id,id,x+offset,CLEAR,2.05,kind === 'home' ? 'wood' : 'glass']);
  }
  for (const [name,street,side,setback,w,d,offset,h,wall,floor,lamp,props] of homes) {
    sideRoom('home-'+wall,'home',name,street,side,setback,w,d,offset,h,[wall,floor,runs[street-1].tiles[2]],lamp,props);
  }
  for (const [name,street,side,setback,w,d,offset,h,tiles,lamp,props,win] of shops) {
    sideRoom('shop-'+tiles[0],'shop',name,street,side,setback,w,d,offset,h,tiles,lamp,props,win);
  }
  for (const [name,street,side,setback,w,d,offset,h,tiles,lamp,props,win] of services) {
    sideRoom('service-'+name,'service',name,street,side,setback,w,d,offset,h,tiles,lamp,props,win);
  }

  return {
    name:'ヘイヴン・リング', sub:'地球軌道港・居住区', seed:317, spawn:[-3,-3,-Math.PI/2], view:[0,1], music:'interior',
    reflect:false, tightPassages:true,
    theme:{wall:['plaster',0xb8a792],floor:['grate',0x89887a],ceil:['ceil',0xb1b2a9],
      trim:'#e6cfa4',lamp:'#ffe3bf',frame:0x635e52,door:0x9d8666,amb:[0xe9e5db,0x8b7760,1.16],
      cstyle:'flat',ribs:false,trims:'none'},
    rooms, doors,
  };
}
