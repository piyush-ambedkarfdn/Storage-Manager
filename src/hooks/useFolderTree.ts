"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import { indexTree } from "@/lib/gallery/tree";
import type { TreeNode } from "@/types/gallery";

/** The explorer tree with counts for the current (non-folder) filters. */
export function useFolderTree(treeQuery: string) {
  const query = useQuery({
    queryKey: ["gallery-tree", treeQuery],
    queryFn: () => requestJson<{ tree: TreeNode[]; total: number }>(`/api/gallery/tree?${treeQuery}`),
    placeholderData: keepPreviousData,
  });
  const tree = useMemo(() => query.data?.tree ?? [], [query.data]);
  const index = useMemo(() => indexTree(tree), [tree]);
  return { ...query, tree, index, total: query.data?.total ?? 0 };
}
