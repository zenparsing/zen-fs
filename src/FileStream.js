import * as FS from "./FS.js";
import { Mutex } from "./Mutex.js";

export class FileStream {

    constructor(fd = 0) {

        this.fd = fd;
        this.position = 0;
        this.path = "";
        this.length = 0;
        this.mutex = new Mutex;
    }

    async close() {

        if (!this.fd)
            return;

        return this.mutex.lock(async $=> {

            var fd = this.fd;
            this.fd = 0;
            await FS.close(fd);
        });
    }

    async end() {

        await this.close();
    }

    async read(buffer) {

        return this.mutex.lock(async $=> {

            // Return EOF if file has been closed
            if (!this.fd)
                return null;

            if (buffer.length === 0)
                return buffer;

            var count = await FS.read(
                this.fd,
                buffer,
                0,
                buffer.length,
                this.position);

            this.position += count;

            return count === 0 ? null : buffer.slice(0, count);

        });
    }

    async write(buffer) {

        return this.mutex.lock($=> {

            if (!this.fd)
                throw new Error("File not open");

            if (buffer.length === 0)
                return;

            var offset = this.position;
            this.position += buffer.length;

            return FS.write(
                this.fd,
                buffer,
                0,
                buffer.length,
                offset);
        });
    }

    async seek(offset) {

        if (!this.fd)
            throw new Error("File not open");

        if (offset < 0)
            throw new Error("Invalid file offset");

        this.position = offset;
    }

}
