// Copyright 2024
// Carlos Alberto Ruiz Naranjo [carlosruiznaranjo@gmail.com]
//
// This file is part of TerosHDL
//
// Colibri is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Colibri is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with TerosHDL.  If not, see <https://www.gnu.org/licenses/>.

import * as yosys from '../../src/colibri/yosys/yosys';
import * as path_lib from 'path';
import { e_source_type, t_file } from "../../src/colibri/project_manager/common";
import { LANGUAGE, VERILOG_LANG_VERSION, VHDL_LANG_VERSION } from '../../src/colibri/common/general';
import { e_schematic_general_backend, get_default_config } from "../../src/colibri/config/config_declaration";

function getFileList(language: LANGUAGE) : t_file[]{
    const langFolder = language === LANGUAGE.VHDL ? 'vhdl' : 'verilog';
    const extension = language === LANGUAGE.VHDL ? '.vhd' : '.v';

    const basePath = path_lib.join(__dirname, 'helpers', langFolder);
    const filePath0 = path_lib.join(basePath, 'mylib', `counter_logic${extension}`);
    const filePath1 = path_lib.join(basePath, `counter_top${extension}`);

    const fileVersion = language === LANGUAGE.VHDL ? VHDL_LANG_VERSION.v2008 : VERILOG_LANG_VERSION.v2005;

    const file0 : t_file = {
        name : filePath0,
        is_include_file: false,
        include_path: '',
        logical_name: 'mylib',
        is_manual: false,
        file_type: language,
        file_version: fileVersion,
        source_type: e_source_type.SYNTHESIS,
    };

    const file1 : t_file = {
        name : filePath1,
        is_include_file: false,
        include_path: '',
        logical_name: '',
        is_manual: false,
        file_type: language,
        file_version: fileVersion,
        source_type: e_source_type.SYNTHESIS,
    };

    return [file0, file1];
}

describe('Yosys', () => {
    it('yosys raw Verilog', (done) => {
        const defaultConfig = get_default_config();
        defaultConfig.schematic.general.backend = e_schematic_general_backend.yosys;

        yosys.runYosysRaw(defaultConfig, 'counter_top', getFileList(LANGUAGE.VERILOG), (result) => {
            expect(result.sucessful).toBe(true);
            expect(result.empty).toBe(false);
            expect(result.error_msg).toBe('');
            expect(result.schematic).not.toBe('');

            done();
        });
    });

    it('yosys yowasp-yosys Verilog', (done) => {
        const defaultConfig = get_default_config();
        defaultConfig.schematic.general.backend = e_schematic_general_backend.yowasp;

        yosys.runYosysRaw(defaultConfig, 'counter_top', getFileList(LANGUAGE.VERILOG), (result) => {
            expect(result.sucessful).toBe(true);
            expect(result.empty).toBe(false);
            expect(result.error_msg).toBe('');
            expect(result.schematic).not.toBe('');

            done();
        });
    });

    it('yosys GHDL VHDL', (done) => {
        const defaultConfig = get_default_config();
        defaultConfig.schematic.general.backend = e_schematic_general_backend.yosys;

        yosys.runYosysGhdl(defaultConfig, 'counter_top', getFileList(LANGUAGE.VHDL), (result) => {
            expect(result.sucessful).toBe(true);
            expect(result.empty).toBe(false);
            expect(result.error_msg).toBe('');
            expect(result.schematic).not.toBe('');

            done();
        });
    });

    it('yosys standalone Verilog', (done) => {
        const defaultConfig = get_default_config();
        defaultConfig.schematic.general.backend = e_schematic_general_backend.yosys;

        yosys.runYosysStandalone(defaultConfig, 'counter_top', getFileList(LANGUAGE.VERILOG), (result) => {
            expect(result.sucessful).toBe(true);
            expect(result.empty).toBe(false);
            expect(result.error_msg).toBe('');
            expect(result.schematic).not.toBe('');

            done();
        });
    }, 10000);
});

describe('Yosys schematic ignorePaths', () => {
    it('filter_schematic_sources returns all sources when no paths are ignored', () => {
        const sources = getFileList(LANGUAGE.VERILOG);
        expect(yosys.filter_schematic_sources(sources, [])).toBe(sources);
        expect(yosys.filter_schematic_sources(sources, [""])).toEqual(sources);
    });

    it('filter_schematic_sources excludes sources matching a glob pattern', () => {
        const sources = getFileList(LANGUAGE.VERILOG);
        const mylib_dir = path_lib.join(__dirname, 'helpers', 'verilog', 'mylib');

        const filtered = yosys.filter_schematic_sources(sources, [`${mylib_dir}/*.v`]);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toContain('counter_top.v');
    });

    it('filter_schematic_sources excludes sources matching an exact file path', () => {
        const sources = getFileList(LANGUAGE.VERILOG);
        const logic_path = path_lib.join(__dirname, 'helpers', 'verilog', 'mylib', 'counter_logic.v');

        const filtered = yosys.filter_schematic_sources(sources, [logic_path]);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toContain('counter_top.v');
    });

    it('getSchematic does not pass the ignored files to Yosys', (done) => {
        const defaultConfig = get_default_config();
        defaultConfig.schematic.general.backend = e_schematic_general_backend.yosys;
        const mylib_dir = path_lib.join(__dirname, 'helpers', 'verilog', 'mylib');
        defaultConfig.schematic.general.ignorePaths = [`${mylib_dir}/*.v`];

        let spawnargs: string[] = [];
        yosys.getSchematic(defaultConfig, 'counter_top', getFileList(LANGUAGE.VERILOG), (result) => {
            const cmd = spawnargs.join(" ");
            expect(cmd).toContain('counter_top.v');
            expect(cmd).not.toContain('counter_logic.v');
            // The excluded file is not part of the generated design
            const modules = Object.keys(JSON.parse(result.schematic).modules);
            expect(modules).toEqual(['counter_top']);

            done();
        }).then((exec_i) => {
            spawnargs = exec_i.spawnargs;
        });
    }, 10000);
});