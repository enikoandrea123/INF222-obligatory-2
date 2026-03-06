import {
    inject,
    createDefaultCoreModule,
    createDefaultSharedCoreModule,
    DefaultSharedCoreModuleContext
} from 'langium';
import { NodeFileSystem } from 'langium/node';

import {
    ZerowGeneratedModule,
    ZerowGeneratedSharedModule
} from './generated/module.js';
import { registerValidationChecks } from './zerow-validator.js';

export function createZerowServices(
    context: DefaultSharedCoreModuleContext = {
        fileSystemProvider: NodeFileSystem.fileSystemProvider
    }
) {
    const shared = inject(
        createDefaultSharedCoreModule(context),
        ZerowGeneratedSharedModule
    );

    const Zerow = inject(
        createDefaultCoreModule({ shared }),
        ZerowGeneratedModule
    );

    shared.ServiceRegistry.register(Zerow);

    registerValidationChecks(Zerow);

    return { shared, Zerow };
}