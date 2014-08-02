import * as FS from "./FS.js";
import { FileStream } from "./FileStream.js";

export class File {

    static async open(path, flags = "r", mode) {

        if (!flags)
            throw new Error("File open flags not specified");

        var info;

        try { info = await FS.stat(path) }
        catch (x) {}

        if (info && !info.isFile())
            throw new Error("File not found");

        var fd = await FS.open(path, flags, mode),
            stream = new FileStream(fd);

        stream.path = path;
        stream.length = info ? info.size : 0;

        return stream;
    }

    static async openRead(path) {

        return this.open(path, "r");
    }

    static async openWrite(path, mode) {

        return this.open(path, "w", mode);
    }

    static async exists(path) {

        try {

            var stat = await FS.stat(path);
            return stat && stat.isFile();

        } catch (x) {

            return false;
        }
    }

    static async delete(path) {

        return FS.unlink(path);
    }

    static async create(path, mode) {

        return this.open(path, "w", mode);
    }

    static async readBytes(path) {

        var stream = await this.open(path, "r");
        var data = await stream.read(new Buffer(stream.length));

        await stream.close();

        return data;
    }

    static async readText(path, encoding = "utf8") {

        return (await this.readBytes(path)).toString(encoding);
    }

    static async writeBytes(path, bytes) {

        var stream = await this.open(path, "w");

        await stream.write(bytes);
        await stream.close();
    }

    static async writeText(path, text, encoding) {

        await this.writeBytes(path, new Buffer(text, encoding));
    }

}
