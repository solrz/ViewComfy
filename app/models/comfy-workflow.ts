import path from "node:path";
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import type { IInput } from "@/app/interfaces/input";
import * as constants from "@/app/constants";
import { getComfyUIRandomSeed } from "@/lib/utils";

const COMFY_INPUTS_DIR = process.env.COMFY_INPUTS_DIR || path.join(process.cwd(), "comfy", "inputs");
const COMFY_WORKFLOWS_DIR = path.join(process.cwd(), "comfy", "workflows");

export class ComfyWorkflow {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private workflow: { [key: string]: any };
    private workflowFileName: string;
    private workflowFilePath: string;
    private id: string;

    constructor(workflow: object) {
        this.workflow = workflow;
        this.id = crypto.randomUUID();
        this.workflowFileName = `workflow_${this.id}.json`;
        this.workflowFilePath = path.join(COMFY_WORKFLOWS_DIR, this.workflowFileName);
    }

  public async setViewComfy(viewComfy: IInput[]) {
    try {
      for (const input of viewComfy) {
        const path = input.key.split("-");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let obj: any = this.workflow;
        for (let i = 0; i < path.length - 1; i++) {
          if (i === path.length - 1) {
            continue;
          }
          obj = obj[path[i]];
        }
        if (input.value instanceof File) {
          const filePath = await this.createFileFromInput(input.value);
          obj[path[path.length - 1]] = filePath;
        } else {
          obj[path[path.length - 1]] = input.value;
        }
      }
    } catch (error) {
      console.error(error);
    }

        for (const key in this.workflow) {
            const node = this.workflow[key];
            switch (node.class_type) {
                case "SaveImage":
                case "VHS_VideoCombine":
                    node.inputs.filename_prefix = this.getFileNamePrefix();
                    break;

                default:
                    Object.keys(node.inputs).forEach((key) => {
                        if (
                            constants.SEED_LIKE_INPUT_VALUES.some(str => key.includes(str))
                            && node.inputs[key] === Number.MIN_VALUE
                        ) {
                            const newSeed = this.getNewSeed();
                            node.inputs[key] = newSeed;
                        }
                    });
            }
        }
    }

    public getWorkflow() {
        return this.workflow;
    }

    public getWorkflowFilePath() {
        return this.workflowFilePath;
    }

    public getWorkflowFileName() {
        return this.workflowFileName;
    }

    public getFileNamePrefix() {
        return `${this.id}_`;
    }

    public getNewSeed() {
        return getComfyUIRandomSeed();
    }

    private async createFileFromInput(file: File) {
        const fileName = `${this.getFileNamePrefix()}${file.name}`;

        try {
            // Try to upload to ComfyUI first
            const uploaded = await this.uploadToComfyUI(file, fileName);
            if (uploaded) {
                return fileName; // Return just filename for ComfyUI
            }
        } catch (error) {
            console.warn('Failed to upload to ComfyUI, falling back to local storage:', error);
        }

        // Fallback to local storage
        const filePath = path.join(COMFY_INPUTS_DIR, fileName);
        const fileBuffer = await file.arrayBuffer();

        // Ensure directory exists
        await fs.mkdir(COMFY_INPUTS_DIR, { recursive: true });
        await fs.writeFile(filePath, Buffer.from(fileBuffer));
        return filePath;
    }

    private async uploadToComfyUI(file: File, fileName: string): Promise<boolean> {
        const baseUrl = process.env.COMFYUI_API_URL || "127.0.0.1:8188";
        const secure = process.env.COMFYUI_SECURE === "true";
        const protocol = secure ? "https://" : "http://";

        const formData = new FormData();
        formData.append('image', file, fileName);

        const response = await fetch(`${protocol}${baseUrl}/upload/image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        return true;
    }
}
