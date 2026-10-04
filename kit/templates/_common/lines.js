// [id, gap before this line in ms, text]. The first letter of an id is the voice (L = the narrator here, S = her).
// This file is the single source: the scene reads it for timing and subtitles, the voice tools read it to know what to say.
// One line = one audio clip = one breath. The gaps ARE the pacing: 300–500 inside a block, about 1000 between blocks.
export const LINES = [
  ['L01', 500, '晚上十一点零五分，她给我发来一条消息，说今天实在是太累了。'],
  ['L02', 400, '我想了很久该怎么回，最后只打了两个字，说我在。'],
  ['S01', 600, '那就好。'],
  ['L03', 900, '第二天早上七点，闹钟响了。她关掉闹钟以后，先跟我说了一声早。'],
];
