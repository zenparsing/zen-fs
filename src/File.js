import {

    pipe,
    readBytes,
    writeBytes,
    bufferBytes,
    decodeText,
    concatText,
    mutex,

} from "streamware";

import * as FS from "./FS.js";

export {

    FileReader,
    FileWriter,
    readFile as read,
    writeFile as write,
    statFile as stat,
    fileExists as exists,
    deleteFile as delete,
    createFile as create,
    readText,
    writeText,

};


const READ_BUFFER_SIZE = 64 * 1024;


class FileReader {

    constructor(fd, position = 0) {

        this.fd = fd;
        this.position = position;
        this._mutex = mutex();
    }

    async seek(position) {

        await this._mutex(async $=> this.position = position);
    }

    async read(buffer = new Buffer(READ_BUFFER_SIZE)) {

        return this._mutex(async $=> {

            if (buffer.length === 0)
                return buffer;

            let bytesRead = await FS.read(this.fd, buffer, 0, buffer.length, this.position);
            this.position += bytesRead;

            if (bytesRead === 0)
                return null;

            if (bytesRead < buffer.length)
                buffer = buffer.slice(0, bytesRead);

            return buffer;
        });
    }

    async close() {

        await this._mutex($=> FS.close(this.fd));
    }

}


class FileWriter {

    constructor(fd, position = 0) {

        this.fd = fd;
        this.position = position;
    }

    async seek(position) {

        await this._mutex($=> this.position = position);
    }

    async write(buffer) {

        await this._mutex(async $=> {

            if (buffer.length === 0)
                return;

            let offset = this.position;
            this.position += buffer.length;
            await FS.write(this.fd, buffer, 0, buffer.length, offset);
        });
    }

    async close() {

        await this._mutex($=> FS.close(this.fd));
    }

}


async function openRead(path) {

    return new FileReader(await FS.open(path, "r"));
}


async function openWrite(path) {

    return new FileWriter(await FS.open(path, "w"));
}


// TODO:  end vs. length vs. options object
async function *readFile(path, start, end = Infinity) {

    let reader = new FileReader(await FS.open(path, "r"), start);

    try { return yield * readBytes(reader, end - reader.position) }
    finally { await reader.close() }
}


async function writeFile(input, path, start) {

    let writer = new FileWriter(await FS.open(path, "w"), start);

    try { await writeBytes(input, writer) }
    finally { await writer.close() }
}


async function statFile(path) {

    try {

        let stat = await FS.stat(path);
        if (stat.isFile()) return stat;

    } catch (x) { }

    return null;
}


async function fileExists(path) {

    return await statFile(path) !== null;
}


function deleteFile(path) {

    return FS.unlink(path);
}


function createFile(path) {

    return writeFile([], path);
}


function readText(path, encoding) {

    return pipe([

        $=> readFile(path),
        input => bufferBytes(input, { size: READ_BUFFER_SIZE }),
        input => decodeText(input, encoding),
        concatText,
    ]);
}


function writeText(path, text, encoding = "utf8") {

    return writeFile([ new Buffer(text, encoding) ], path);
}
