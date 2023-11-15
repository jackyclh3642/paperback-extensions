import {
    DUIButton,
    DUINavigationButton,
    SourceStateManager
} from '@paperback/types'

export const getShowNSFW = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_nsfw') as boolean) ?? false
}

export const getSkipExtra = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (
        (await stateManager.retrieve('skip_extra') as boolean) ?? true
    )
}

export const contentSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'content_settings',
        label: 'Content Settings',
        form: App.createDUIForm({
            sections: async () =>
                [
                    App.createDUISection({
                        isHidden: false,
                        id: 'content',
                        rows: async () => {
                            await Promise.all([
                                getShowNSFW(stateManager),
                                getSkipExtra(stateManager)
                            ])

                            return await [

                                App.createDUISwitch({
                                    id: 'show_nsfw',
                                    label: 'Show NSFW Content',
                                    value: App.createDUIBinding({
                                        get: async () => getShowNSFW(stateManager),
                                        set: async (value: boolean) => { await stateManager.store('show_nsfw', value) }
                                    })
                                }),

                                App.createDUISwitch({
                                    id: 'skip_extra',
                                    label: 'Skip Extra Content',
                                    value: App.createDUIBinding({
                                        get: async () => getSkipExtra(stateManager),
                                        set: async (value: boolean) => { await stateManager.store('skip_extra', value) }
                                    })
                                }),

                            ]

                        }
                    })
                ]
        })
    })

}

export function resetSettings(stateManager: SourceStateManager): DUIButton {
    return App.createDUIButton({
        id: 'reset',
        label: 'Reset to Default',
        onTap: async () => {
            await stateManager.store('show_nsfw', false),
            await stateManager.store('skip_extra', true)
        }
    })
}