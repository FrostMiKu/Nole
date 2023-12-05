import { atom } from "jotai";
import { NoleFile } from "./file";
import { RibbonItem } from "./type";

export const AppInitializedAtom = atom(false);
export const CurrentFileAtom = atom<NoleFile|null>(null);
export const RibbonAtom = atom<RibbonItem[]>([])