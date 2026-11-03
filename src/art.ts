const wrap = (body: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 48 48" fill="none" aria-hidden="true">${body}</svg>`;
export function icon(name: string, cls = ''): string {
  const shapes: { [key: string]: string } = {
    flower: '<path d="M24 31v13m0-6c-10 0-12-7-12-7 9-1 12 7 12 7m0-4c8 0 11-6 11-6-8-1-11 6-11 6" stroke="#779664" stroke-width="2.5" stroke-linecap="round"/><g fill="#e6a2b2"><ellipse cx="24" cy="12" rx="6" ry="9"/><ellipse cx="24" cy="26" rx="6" ry="9"/><ellipse cx="17" cy="19" rx="9" ry="6"/><ellipse cx="31" cy="19" rx="9" ry="6"/></g><circle cx="24" cy="19" r="6" fill="#f7d575"/>',
    seed: '<path d="M25 38V21" stroke="#78955d" stroke-width="2.5" stroke-linecap="round"/><path d="M25 26C10 27 8 13 8 13c14-1 18 7 17 13Z" fill="#bacd8a"/><path d="M25 21C24 10 37 8 37 8c2 12-5 16-12 13Z" fill="#8cab72"/><ellipse cx="24" cy="39" rx="14" ry="4" fill="#e2c59c"/>',
    sprout: '<path d="M25 43V19" stroke="#79975f" stroke-width="2.5" stroke-linecap="round"/><path d="M25 31C9 33 7 18 7 18c15-2 19 6 18 13Z" fill="#b4cd8b"/><path d="M25 22C23 9 39 6 39 6c2 14-5 18-14 16Z" fill="#87a96f"/>',
    sun: '<g stroke="#d7ad53" stroke-width="2.5" stroke-linecap="round"><path d="M24 4v4m0 32v4M4 24h4m32 0h4M10 10l3 3m22 22 3 3M10 38l3-3m22-22 3-3"/></g><circle cx="24" cy="24" r="12" fill="#f1d17c"/><path d="M19 26q5 6 10 0" stroke="#9d7c44" stroke-width="1.8" stroke-linecap="round"/><g fill="#9d7c44"><circle cx="20" cy="21" r="1"/><circle cx="28" cy="21" r="1"/></g>',
    print: '<g stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M14 17V7h20v10M14 34H8V18h32v16h-6M14 28h20v14H14z"/><path d="M32 23h2M19 34h10m-10 4h10" stroke-linecap="round"/></g>',
    arrow: '<path d="M9 24h29M27 13l11 11-11 11" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    heart: '<path d="M24 39S5 28 5 16C5 4 20 3 24 14 28 3 43 4 43 16c0 12-19 23-19 23Z" fill="#e5a2ae"/>',
    back: '<path d="m27 12-12 12 12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="m11 25 9 9 18-20" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    help: '<circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="2.5"/><path d="M18 18c0-8 15-7 12 1-1 3-6 3-6 8m0 6v1" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    sound: '<path d="M8 19h8L28 9v30L16 29H8Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M34 17q7 7 0 14m5-20q12 13 0 26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    silent: '<path d="M8 19h8L28 9v30L16 29H8Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="m35 19 10 10m0-10L35 29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    close: '<path d="m14 14 20 20m0-20L14 34" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  };
  return wrap(shapes[name] || shapes.flower, cls);
}
export function gardenArt(): string {
  return `<svg class="garden-art" viewBox="0 0 580 340" fill="none" role="img" aria-label="小兔在花园里浇花，小花和蝴蝶陪你一起学习">
  <defs><linearGradient id="hill" x1="290" y1="180" x2="290" y2="320" gradientUnits="userSpaceOnUse"><stop stop-color="#dfebd0"/><stop offset="1" stop-color="#c9dcb2"/></linearGradient></defs>
  <path d="M58 258C42 170 113 90 202 96c78-92 221-56 234 50 100 4 118 113 53 143Z" fill="#f0eedc"/>
  <g fill="#fffdf6"><ellipse cx="111" cy="95" rx="42" ry="13"/><ellipse cx="96" cy="87" rx="15" ry="15"/><ellipse cx="118" cy="82" rx="20" ry="19"/><ellipse cx="426" cy="67" rx="36" ry="10"/><ellipse cx="423" cy="58" rx="16" ry="15"/></g>
  <g stroke="#d9b861" stroke-width="2.5" stroke-linecap="round"><path d="M348 42v-9m0 73v-9m-26-29h-9m70 0h-9m-45-19-7-7m52 52-7-7m0-38 7-7m-45 45-7 7"/></g><circle cx="348" cy="68" r="23" fill="#f5d88a"/><circle cx="341" cy="65" r="1.5" fill="#a58b51"/><circle cx="355" cy="65" r="1.5" fill="#a58b51"/><path d="M342 74q6 5 12 0" stroke="#a58b51" stroke-width="2" stroke-linecap="round"/>
  <path d="M42 278c41-60 109-88 185-56 91-71 198-68 305 48v37H42Z" fill="url(#hill)"/>
  <ellipse cx="287" cy="300" rx="235" ry="16" fill="#c6d5ab" opacity=".5"/>
  <g stroke="#c4b58f" stroke-width="6" stroke-linecap="round"><path d="M432 195v91m29-98v98m30-76v76M422 226h84m-84 28h84"/></g>
  <g stroke="#7f9c64" stroke-width="4" stroke-linecap="round"><path d="M356 281v-62m49 60v-91m-86 93v-32m-174 35v-43M89 281v-37"/></g>
  <g fill="#9fba7e"><path d="M355 267c-24 0-26-21-26-21 22 0 26 21 26 21m1-17c21 0 24-20 24-20-22 0-24 20-24 20m48 8c24 0 26-23 26-23-24 0-26 23-26 23m-1-23c-21 0-25-21-25-21 22 0 25 21 25 21M145 267c-21 0-23-18-23-18 20 0 23 18 23 18M89 269c17 0 20-17 20-17-19 0-20 17-20 17"/></g>
  ${flowerAt(355, 213, '#e5a0ae', 1)}${flowerAt(405, 183, '#d2b9d7', 1.14)}${flowerAt(145, 237, '#f5d88a', .85)}${flowerAt(89, 241, '#faf4e4', .6)}${flowerAt(319, 246, '#faf4e4', .58)}
  <g transform="translate(174 100)"><ellipse cx="56" cy="180" rx="47" ry="9" fill="#a7bd8a" opacity=".5"/><ellipse cx="52" cy="143" rx="39" ry="43" fill="#faf4e5" stroke="#dacfb8" stroke-width="2"/><ellipse cx="27" cy="178" rx="23" ry="10" fill="#faf4e5" stroke="#dacfb8" stroke-width="2"/><ellipse cx="74" cy="178" rx="21" ry="10" fill="#faf4e5" stroke="#dacfb8" stroke-width="2"/><ellipse cx="30" cy="39" rx="14" ry="38" transform="rotate(-12 30 39)" fill="#fff9eb" stroke="#dacfb8" stroke-width="2"/><ellipse cx="66" cy="37" rx="14" ry="37" transform="rotate(8 66 37)" fill="#fff9eb" stroke="#dacfb8" stroke-width="2"/><ellipse cx="30" cy="36" rx="6" ry="24" transform="rotate(-12 30 36)" fill="#edc1bf"/><ellipse cx="66" cy="34" rx="6" ry="23" transform="rotate(8 66 34)" fill="#edc1bf"/><ellipse cx="49" cy="89" rx="43" ry="37" fill="#fff9eb" stroke="#dacfb8" stroke-width="2"/><circle cx="33" cy="85" r="3" fill="#655647"/><circle cx="63" cy="85" r="3" fill="#655647"/><ellipse cx="24" cy="96" rx="8" ry="5" fill="#edc1bf"/><ellipse cx="74" cy="96" rx="8" ry="5" fill="#edc1bf"/><path d="m45 95 4 3 4-3m-4 3v4m-7-1q7 8 14 0" stroke="#9a7c6c" stroke-width="2" stroke-linecap="round"/><path d="M24 119q28 16 55-2l4 39q-26 20-62 0Z" fill="#d9a9b0"/><path d="M39 129h27v21q-13 10-27 0Z" fill="#ecc9c8"/><path d="M75 129q19 0 22 13" stroke="#dacfb8" stroke-width="16" stroke-linecap="round"/><path d="M75 128q19 0 22 13" stroke="#fff9eb" stroke-width="13" stroke-linecap="round"/>
  <g transform="translate(85 131) rotate(-15)"><path d="M8 4c-19-15-30 8-15 17" stroke="#8ca6a0" stroke-width="5"/><path d="M0 5h39v29q-20 10-39 0Z" fill="#9cb9b0"/><path d="m39 18 29-12 3 6-32 19" fill="#9cb9b0"/><ellipse cx="70" cy="8" rx="5" ry="10" transform="rotate(-35 70 8)" fill="#7c9d94"/><path d="M75 15l4 6m1-10 6 4m-12 7 2 7" stroke="#94b8c7" stroke-width="2.5" stroke-linecap="round"/></g></g>
  <g transform="translate(470 127) rotate(-16)"><path d="M0 7C-30-21-29 18-3 15c-26 15-9 30 5 8 12 18 30 5 6-7 29 2 25-32-6-9Z" fill="#d5b9d9"/><path d="M2 7v16" stroke="#9c89a1" stroke-width="2"/></g>
  <g fill="#f7efda"><circle cx="115" cy="296" r="3"/><circle cx="454" cy="294" r="3"/><circle cx="372" cy="298" r="3"/></g><g stroke="#8ba16d" stroke-width="2" stroke-linecap="round"><path d="m112 277 3-9 4 9m333 0 3-8 4 8m-71 8 3-7 3 7"/></g>
  </svg>`;
}
function flowerAt(x: number, y: number, color: string, scale: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${color}"><ellipse cy="-12" rx="9" ry="12"/><ellipse cy="12" rx="9" ry="12"/><ellipse cx="-12" rx="12" ry="9"/><ellipse cx="12" rx="12" ry="9"/><circle r="8" fill="#eac974"/></g>`;
}
