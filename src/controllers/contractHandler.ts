import winston from 'winston';
import * as conseiljs from 'conseiljs';

export class ContractHandler {
    constructor(private _logger: winston.Logger, private _tezosConfig){
    }

    async writeToOracleContract(contractAddress, storageMichelson) {
        const keystore = {
            publicKey: this._tezosConfig.publicKey,
            privateKey: this._tezosConfig.privateKey,
            publicKeyHash: this._tezosConfig.keyHash,
            seed: '',
            storeType: conseiljs.StoreType.Fundraiser
        };

        try {
            const result = await conseiljs.TezosNodeWriter.sendContractInvocationOperation(
                                    this._tezosConfig.nodeAddress, keystore, contractAddress,  
                                    0, 100000, '', 1000, 750000, undefined,
                                    storageMichelson,
                                    conseiljs.TezosParameterFormat.Michelson);
            const opHash = this.clearRPCOperationGroupHash(result.operationGroupID);
            this._logger.info(`created transaction for ${storageMichelson} with tx: ${opHash}`);
            const conseilServerInfo = {
                url: this._tezosConfig.conseilServerAddress,
                apiKey: this._tezosConfig.conseilServerAPIKEY,
                network: this._tezosConfig.conseilServerNetwork
            } as conseiljs.ConseilServerInfo;
            const conseilResult = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
                                            conseilServerInfo, conseilServerInfo.network, opHash, 5, 30+1);
            this._logger.info(conseilResult);
            if (conseilResult.status === 'applied') {
                this._logger.info(`Inserted data info for ${storageMichelson} with txId: ${opHash}`);
                return opHash;
            }

            this._logger.info(`Could not confirm the transaction: ${opHash} for ${storageMichelson}`);
            return '';
        } catch(error) {
            this._logger.error(`Error while calling oracle contract ${error} for ${storageMichelson}`);
            return '';
        }
    }

    private clearRPCOperationGroupHash(id: string) {
        return id.replace(/\"/g, '').replace(/\n/, '');
    }
}