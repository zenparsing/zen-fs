import * as FS from "./FS.js";
import * as Path from "node:path";


export {

    exists,
    list,
    deleteDirectory as delete,
    create,
    traverse,

};


async function exists(path) {

    try {

        var stat = await FS.stat(path);
        return stat.isDirectory();

    } catch (x) {

        return false;
    }
}


async function list(path) {

    return FS.readdir(path);
}


async function deleteDirectory(path, recursive = false) {

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


async function create(path, mode) {

    if (await this.exists(path))
        return;

    var parent = Path.dirname(path);

    if (parent && parent !== "." && parent !== Path.dirname(parent))
        await this.create(parent, mode);

    await FS.mkdir(path, mode);
}


async function traverse(path, pre, post) {

    async function visit(path) {

        if (pre && !await pre(path))
            return;

        var list = [];

        try { list = await FS.readdir(path) }
        catch (x) { }

        for (var item of list)
            await visit(Path.join(path, item));

        if (await FS.exists(path))
            await post(path);
    }

    if (!post) {

        post = pre;
        pre = null;
    }

    await visit(Path.resolve(path));
}
