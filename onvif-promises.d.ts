declare module 'onvif/promises' {
    import { Cam as OriginalCam } from 'onvif';

    interface CamOptions extends OriginalCam.Options {
    }

    interface Capabilities {
        device?: any;
        events?: any;
        imaging?: any;
        media?: any;
        PTZ?: any;
        extension?: any;
    }

    interface DeviceInformation {
        manufacturer: string;
        model: string;
        firmwareVersion: string;
        serialNumber: string;
        hardwareId: string;
    }

    interface HostnameInformation {
        fromDHCP: boolean;
        name?: string;
    }

    interface Scope {
        scopeDef: string;
        scopeItem: string;
    }

    interface Service {
        namespace: string;
        XAddr: string;
        version: {
            minor: number;
            major: number;
        }
    }

    interface ActiveSource {
        sourceToken: string;
        profileToken: string;
        videoSourceConfigurationToken: string;
        ptz?: {
            name: string;
            token: string;
        }
    }

    type DateTimeCallback = (err: Error | null, dateTime?: Date, xml?: string) => void;
    type MessageCallback = (err: Error | null, message?: string, xml?: string) => void;
    type ConnectionCallback = (err: Error | null) => void;
    type GetCapabilitiesCallback = (err: Error | null, capabilities?: Capabilities, xml?: string) => void;
    type GetDeviceInformationCallback = (err: Error | null, deviceInformation?: DeviceInformation, xml?: string) => void;
    type GetHostnameCallback = (err: Error | null, hostnameInformation?: HostnameInformation, xml?: string) => void;
    type GetScopesCallback = (err: Error | null, scopes?: Scope[], xml?: string) => void;
    type GetServicesCallback = (err: Error | null, services?: Service[], xml?: string) => void;

    class Cam extends OriginalCam {
        constructor(options: CamOptions);
        connect(): Promise<void>;
        connect(callback: ConnectionCallback): void;
        getSystemDateAndTime(): Promise<Date>;
        getSystemDateAndTime(callback: DateTimeCallback): void;
        setSystemDateAndTime(options: any): Promise<Date>;
        setSystemDateAndTime(options: any, callback: DateTimeCallback): void;
        getCapabilities(): Promise<Capabilities>;
        getCapabilities(callback: GetCapabilitiesCallback): void;
        getServiceCapabilities(): Promise<any>;
        getServiceCapabilities(callback: (err: Error | null, serviceCapabilities?: any, xml?: string) => void): void;
        getActiveSources(): void;
        getServices(includeCapability?: boolean): Promise<Service[]>;
        getServices(includeCapability: boolean, callback: GetServicesCallback): void;
        getServices(callback: GetServicesCallback): void;
        getDeviceInformation(): Promise<DeviceInformation>;
        getDeviceInformation(callback: GetDeviceInformationCallback): void;
        getHostname(): Promise<HostnameInformation>;
        getHostname(callback: GetHostnameCallback): void;
        getScopes(): Promise<Scope[]>;
        getScopes(callback: GetScopesCallback): void;
        setScopes(scopes: string[]): Promise<Scope[]>;
        setScopes(scopes: string[], callback: GetScopesCallback): void;
        systemReboot(): Promise<string>;
        systemReboot(callback: MessageCallback): void;
        setSystemFactoryDefault(hard?: boolean): Promise<void>;
        setSystemFactoryDefault(hard: boolean, callback: (err: Error | null, xml?: string) => void): void;
        setSystemFactoryDefault(callback: (err: Error | null, xml?: string) => void): void;
        [key: string]: any;
        capabilities: Capabilities;
        services: Service[];
        deviceInformation: DeviceInformation;
        hostnameInformation: HostnameInformation;
        scopes: Scope[];
        activeSources: ActiveSource[];
        defaultProfiles: any[];
        defaultProfile: any;
        activeSource: ActiveSource;
        uri: any;
        media2Support: boolean;
        timeShift: number;
    }

    const promisifiedMethods: string[];

    export { Cam, promisifiedMethods };
}