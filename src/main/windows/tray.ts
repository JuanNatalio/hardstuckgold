import { Menu, nativeImage, Tray } from 'electron'
import type { AppPhase } from '../../shared/phase-types'

// 16x16 rounded squares, generated offline (see docs in PR #6): gold = League
// open, gray = League closed. Real branded .ico assets arrive with packaging.
const ICON_GOLD =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJ0lEQVR4nGM4uUidgRKMzPlPIkYxgFTNcENGDRg1YJgZQHFmIhsDAKDLUV/nEsHnAAAAAElFTkSuQmCC'
const ICON_GRAY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJklEQVR4nGOISsphoAQjc/6TiFEMIFUz3JBRA0YNGGYGUJyZyMYAWyPnUHS8FlcAAAAASUVORK5CYII='

const PHASE_LABELS: Record<AppPhase, string> = {
  LeagueClosed: 'League closed',
  Idle: 'League open',
  Lobby: 'In lobby',
  ChampSelect: 'Champ select',
  InProgress: 'In game',
  EndOfGame: 'Post game'
}

interface TrayCallbacks {
  onShowWindow(): void
  onQuit(): void
}

/** System tray icon whose image + tooltip reflect the current app phase. */
export class AppTray {
  private readonly tray: Tray

  constructor(callbacks: TrayCallbacks) {
    this.tray = new Tray(nativeImage.createFromDataURL(ICON_GRAY))
    this.tray.setToolTip(`hardstuckgold — ${PHASE_LABELS.LeagueClosed}`)
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Show hardstuckgold', click: () => callbacks.onShowWindow() },
        { type: 'separator' },
        { label: 'Quit', click: () => callbacks.onQuit() }
      ])
    )
    this.tray.on('click', () => callbacks.onShowWindow())
  }

  setPhase(phase: AppPhase): void {
    const icon = phase === 'LeagueClosed' ? ICON_GRAY : ICON_GOLD
    this.tray.setImage(nativeImage.createFromDataURL(icon))
    this.tray.setToolTip(`hardstuckgold — ${PHASE_LABELS[phase]}`)
  }

  destroy(): void {
    this.tray.destroy()
  }
}
