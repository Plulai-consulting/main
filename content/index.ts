import { en } from './en'
import { ar } from './ar'
import type { Dict } from './en'
export type Locale = 'en' | 'ar'
export const getDict = (l: Locale): Dict => (l === 'ar' ? ar : en)
