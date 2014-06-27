var Path = require("path");

module FS from "FS.js";

export class Directory {

    static async exists(path) {
    
        try {
        
            var stat = await FS.stat(path);
            return stat.isDirectory();
        
        } catch (x) {
        
            return false;
        }
    }
    
    static async list(path) {
    
        return FS.readdir(path);
    }
    
    static async delete(path, recursive = false) {
    
        if (!recursive)
            return FS.rmdir(path);
        
        await this.traverse(path, async path => { 
    
            var stat;
        
            try { stat = await FS.stat(path) }
            catch (x) { }
        
            if (!stat)
                return;
        
            if (stat.isDirectory())
                await FS.rmdir(path);
            else
                await FS.unlink(path);
        });
    }
    
    static async create(path, mode) {
    
        if (await this.exists(path))
            return;
        
        var parent = Path.dirname(path);
        
        if (parent && parent !== "." && parent !== Path.dirname(parent))
            await this.create(parent, mode);
        
        await FS.mkdir(path, mode);
    }
    
    static async traverse(path, fn) {
    
        var list = [];
    
        try { list = await FS.readdir(path) }
        catch (x) { }

        for (var i = 0; i < list.length; ++i)
            await this.traverse(Path.join(path, list[i]), fn);
    
        if (await FS.exists(path))
            await fn(path);
    }
    
}