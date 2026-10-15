import * as Tooltip from '@radix-ui/react-tooltip';
import * as Switch from '@radix-ui/react-switch';
import type { ReactNode } from 'react';
import { Button } from './button';
export function Tool({label,children,active,onClick,disabled,id,primary=false}:{label:string;children:ReactNode;active?:boolean;onClick:()=>void;disabled?:boolean;id:string;primary?:boolean}) {
  return <Tooltip.Root><Tooltip.Trigger asChild><Button data-od-id={id} size="icon" variant={primary?'default':'ghost'} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active} className={active?'is-active':''}>{children}</Button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={6}>{label}<Tooltip.Arrow/></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}
export function Toggle({label,checked,onChange,id}:{label:string;checked:boolean;onChange:(v:boolean)=>void;id:string}) {
  return <label className="toggle-label" data-od-id={`${id}-label`}><Switch.Root className="switch" data-od-id={id} checked={checked} onCheckedChange={onChange} aria-label={label}><Switch.Thumb className="switch-thumb"/></Switch.Root><span>{label}</span></label>;
}
