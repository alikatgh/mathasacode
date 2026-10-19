// Apply small, checked host-side adaptations to the pinned upstream source.
// The original vendor download and its digest remain unchanged.
export function prepareClangHost(source) {
  const readString = /function readStr\(u8, o, len = -1\) \{[\s\S]*?\n\}/g;
  const writeOutput = /  host_write\(fd, iovs, iovs_len, nwritten_out\) \{[\s\S]*?\n  \}/g;
  if ([...source.matchAll(readString)].length !== 1 || [...source.matchAll(writeOutput)].length !== 1) {
    throw new Error('The pinned Clang host layout changed; review its memory and output adapters.');
  }
  return source.replace(readString, `function readStr(u8, o, len = -1) {
  if (!Number.isInteger(o) || o < 0 || o > u8.length || !Number.isInteger(len) || len < -1)
    throw new Error('Invalid runtime string range.');
  if (len > u8.length - o) throw new Error('Runtime string is outside its memory.');
  if (len > 32769) throw new Error('Runtime string exceeds 32 KB.');
  let str = '';
  const end = len === -1 ? Math.min(u8.length, o + 32769) : o + len;
  for (let i = o; i < end && u8[i] !== 0; ++i) str += String.fromCharCode(u8[i]);
  if (len === -1 && str.length === 32769) throw new Error('Runtime string exceeds 32 KB.');
  return str;
}`).replace(writeOutput, `  host_write(fd, iovs, iovs_len, nwritten_out) {
    this.hostMem_.check();
    if ((fd !== 1 && fd !== 2) || !Number.isInteger(iovs_len) || iovs_len < 0 || iovs_len > 1024)
      throw new Error('Invalid standard-output request.');
    this.macOutputDecoders ||= new Map();
    if (!this.macOutputDecoders.has(fd)) this.macOutputDecoders.set(fd, new TextDecoder());
    const decoder = this.macOutputDecoders.get(fd);
    let size = 0;
    let str = '';
    for (let i = 0; i < iovs_len; ++i) {
      const buf = this.hostMem_.read32(iovs);
      const len = this.hostMem_.read32(iovs + 4);
      iovs += 8;
      const bytes = this.hostMem_.u8;
      if (!Number.isInteger(buf) || !Number.isInteger(len) || buf < 0 || len < 0 || buf > bytes.length || len > bytes.length - buf)
        throw new Error('Standard output is outside runtime memory.');
      const take = Math.min(len, 32769 - size);
      str += decoder.decode(bytes.subarray(buf, buf + take), { stream: true });
      size += take;
      if (take < len) {
        this.hostWrite(str);
        throw new Error('Output stopped at 32 KB.');
      }
    }
    this.hostMem_.write32(nwritten_out, size);
    this.hostWrite(str);
    return ESUCCESS;
  }`);
}
