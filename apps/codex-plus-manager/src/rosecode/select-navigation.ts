/** 跳过不可选项并循环移动；空列表或全部禁用时返回 -1。 */
export function nextSelectIndex(options: ReadonlyArray<{ disabled?: boolean }>, start: number, direction: 1 | -1): number {
  for (let step = 1; step <= options.length; step++) {
    const index = ((start + direction * step) % options.length + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function selectSearchIndex(labels: string[], query: string, start: number): number {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return -1;
  for (let step = 1; step <= labels.length; step++) {
    const index = (Math.max(start, -1) + step) % labels.length;
    if (labels[index].toLocaleLowerCase().startsWith(needle)) return index;
  }
  return -1;
}
