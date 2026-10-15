/** Per-renderer resources. Pending loads can never destroy another renderer's assets. */
export class OwnedAssets<T> {
  private resources=new Map<string,T>();
  private pending=new Map<string,Promise<void>>();
  private disposed=false;
  constructor(private release:(resource:T)=>void){}
  get(key:string){return this.resources.get(key);}
  values(){return this.resources.values();}
  has(key:string){return this.resources.has(key);}
  isPending(key:string){return this.pending.has(key);}
  get size(){return this.resources.size;}
  load(key:string,loader:()=>Promise<T>,onError:()=>void):Promise<void>{
    if(this.disposed||this.resources.has(key))return Promise.resolve();
    const existing=this.pending.get(key);if(existing)return existing;
    const task=(async()=>{
      // Defer invocation until pending is registered, including synchronously throwing loaders.
      await Promise.resolve();
      try{if(this.disposed)return;const resource=await loader();if(this.disposed)this.release(resource);else this.resources.set(key,resource);}
      catch{if(!this.disposed)onError();}
      finally{this.pending.delete(key);}
    })();
    this.pending.set(key,task);return task;
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const resource of this.resources.values())this.release(resource);this.resources.clear();}
}
