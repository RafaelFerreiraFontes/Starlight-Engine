import { describe,expect,it,vi } from 'vitest';
import { OwnedAssets } from '../src/rendering/pixi/OwnedAssets';
describe('Per-renderer asset ownership without a GPU',()=>{
  it('releases a late load after closure without touching a reopened renderer',async()=>{
    const release=vi.fn(),errors=vi.fn();let resolve!:(r:{id:number})=>void;
    const old=new OwnedAssets(release),current=new OwnedAssets(release);
    const pending=old.load('atlas',()=>new Promise(r=>{resolve=r;}),errors);await Promise.resolve();old.dispose();
    const fresh={id:2};await current.load('atlas',async()=>fresh,errors);const stale={id:1};resolve(stale);await pending;
    expect(release).toHaveBeenCalledExactlyOnceWith(stale);expect(current.get('atlas')).toBe(fresh);expect(errors).not.toHaveBeenCalled();
    current.dispose();current.dispose();expect(release).toHaveBeenCalledTimes(2);
  });
  it('suppresses load failures after unmount',async()=>{const errors=vi.fn();let reject!:(e:Error)=>void;const assets=new OwnedAssets(vi.fn());const pending=assets.load('atlas',()=>new Promise((_resolve,r)=>{reject=r;}),errors);await Promise.resolve();assets.dispose();reject(new Error('decode failed'));await pending;expect(errors).not.toHaveBeenCalled();});
  it('deduplicates pending loads within one renderer and reports active failures',async()=>{const errors=vi.fn(),assets=new OwnedAssets(vi.fn());const loader=vi.fn(async()=>({id:1}));await Promise.all([assets.load('atlas',loader,errors),assets.load('atlas',loader,errors)]);expect(loader).toHaveBeenCalledOnce();await assets.load('missing',async()=>{throw new Error('missing');},errors);expect(errors).toHaveBeenCalledOnce();assets.dispose();});
  it('allows retry after a loader throws synchronously',async()=>{const errors=vi.fn(),assets=new OwnedAssets(vi.fn());await assets.load('atlas',()=>{throw new Error('decode setup');},errors);const fresh={id:3};await assets.load('atlas',async()=>fresh,errors);expect(errors).toHaveBeenCalledOnce();expect(assets.get('atlas')).toBe(fresh);assets.dispose();});
  it('does not start a queued decode after disposal',async()=>{const loader=vi.fn(async()=>({id:1})),assets=new OwnedAssets(vi.fn());const pending=assets.load('atlas',loader,vi.fn());assets.dispose();await pending;expect(loader).not.toHaveBeenCalled();});
  it('tracks has, isPending, and size during lifecycle',async()=>{
    const assets = new OwnedAssets<string>(vi.fn());
    let resolve!:(val:string)=>void;
    const task = assets.load('tex1',()=>new Promise(r=>{resolve=r;}),vi.fn());
    expect(assets.isPending('tex1')).toBe(true);
    expect(assets.has('tex1')).toBe(false);
    expect(assets.size).toBe(0);
    resolve('loaded');
    await task;
    expect(assets.isPending('tex1')).toBe(false);
    expect(assets.has('tex1')).toBe(true);
    expect(assets.size).toBe(1);
    assets.dispose();
  });
});
