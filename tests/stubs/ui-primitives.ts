/**
 * 运行锁定版本发布包中的真实表单模型和输入控件。
 * 包入口还会加载 Markdown、图标等宿主模块；仅提取其独立的 bundle regions，
 * 隔离与表单无关的依赖。区域变动会明确失败，不回退到手写表单替身。
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createSnapshotStore } from './client-store.ts'
import { jsx, jsxs } from './jsx-runtime.ts'
import { useState } from './react.ts'
import type * as Primitives from '@deepseek-ai/dsh-client-ui-primitives'

export type {
  SettingsFormPathOp, SettingsFormScopeSnapshot, SettingsFormScope, SettingsFieldSpec,
  SettingsFieldState, SettingsFormShell, SettingsFormActions,
} from '@deepseek-ai/dsh-client-ui-primitives'

const require = createRequire(import.meta.url)
const bundle = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
function region(name: string): string {
  const marker = `//#region lib/types/settings-form/${name}.js\n`
  const start = bundle.indexOf(marker)
  const end = bundle.indexOf('//#endregion', start)
  if (start < 0 || end < start) throw new Error(`Missing published settings-form region: ${name}`)
  return bundle.slice(start + marker.length, end).replace(/\bcss\$\d+\b/gu, 'css')
}
export function Tag(_props: unknown): unknown { return null }
export function Switch(_props: unknown): unknown { return null }
export function IconChevronDownOutlineRegular(_props: unknown): unknown { return null }
export function IconChevronRightOutlineRegular(_props: unknown): unknown { return null }
export function SettingsForm(_props: unknown): unknown { return null }

const real = new Function('createSnapshotStore', 'jsx', 'jsxs', 'useState', 'Tag', 'IconInfoOutlineRegular', 'css',
  `${region('form-model')}\n${region('fields')}\nreturn { SettingsFormModel, settingsTextField, settingsNumberField, SettingsSecretField, SettingsValueField }`,
)(createSnapshotStore, jsx, jsxs, useState, Tag, Tag, {}) as Pick<typeof Primitives,
  'SettingsFormModel' | 'settingsTextField' | 'settingsNumberField' | 'SettingsSecretField' | 'SettingsValueField'>

export const { SettingsFormModel, settingsTextField, settingsNumberField, SettingsSecretField, SettingsValueField } = real
