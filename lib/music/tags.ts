import NodeID3 from "node-id3";

export type TagInput = {
  title: string;
  artist: string;
  genre: string;
  isrc: string | null;
  copyright: string;
  year: number;
  orderRef: string;
  cover?: { buffer: Buffer; mime: string } | null;
};

/** The labels written into a purchased MP3, so it shows up properly in any music app. */
export function buildTags(t: TagInput): NodeID3.Tags {
  const tags: NodeID3.Tags = {
    title: t.title,
    artist: t.artist,
    album: t.title,
    genre: t.genre,
    year: String(t.year),
    copyright: t.copyright,
    publisher: "Fish Guy Sounds",
    comment: { language: "eng", text: `Bought on Fish Guy Sounds. Order ${t.orderRef}.` },
  };
  if (t.isrc) tags.ISRC = t.isrc;
  if (t.cover) tags.image = { mime: t.cover.mime, type: { id: 3, name: "front cover" }, description: "Cover", imageBuffer: t.cover.buffer };
  return tags;
}

/** Writes the labels into the MP3 and keeps the audio untouched. If anything goes wrong, the original file is returned. */
export function tagMp3(file: Buffer, tags: NodeID3.Tags): Buffer {
  try {
    const out = NodeID3.update(tags, file);
    return Buffer.isBuffer(out) && out.length >= file.length ? out : file;
  } catch {
    return file;
  }
}
