export type DialogType = 'success' | 'error' | 'warning' | 'info';

export interface DialogData {
  type: DialogType;
  title: string;
  message: string;
}