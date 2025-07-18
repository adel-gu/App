import React, {useCallback, useMemo, useState} from 'react';
import type {LayoutChangeEvent, ListRenderItem} from 'react-native';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import TransactionPreview from '@components/ReportActionItem/TransactionPreview';
import usePolicy from '@hooks/usePolicy';
import useReportWithTransactionsAndViolations from '@hooks/useReportWithTransactionsAndViolations';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useTransactionViolations from '@hooks/useTransactionViolations';
import Performance from '@libs/Performance';
import {getIOUActionForReportID, isSplitBillAction as isSplitBillActionReportActionsUtils, isTrackExpenseAction as isTrackExpenseActionReportActionsUtils} from '@libs/ReportActionsUtils';
import {isIOUReport} from '@libs/ReportUtils';
import Navigation from '@navigation/Navigation';
import {contextMenuRef} from '@pages/home/report/ContextMenu/ReportActionContextMenu';
import Timing from '@userActions/Timing';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Transaction} from '@src/types/onyx';
import MoneyRequestReportPreviewContent from './MoneyRequestReportPreviewContent';
import type {MoneyRequestReportPreviewProps} from './types';

function MoneyRequestReportPreview({
    allReports,
    policies,
    iouReportID,
    policyID,
    chatReportID,
    action,
    contextMenuAnchor,
    isHovered = false,
    isWhisper = false,
    checkIfContextMenuActive = () => {},
    onPaymentOptionsShow,
    onPaymentOptionsHide,
    shouldDisplayContextMenu = true,
    isInvoice = false,
    shouldShowBorder,
}: MoneyRequestReportPreviewProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const personalDetailsList = usePersonalDetails();
    const chatReport = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${chatReportID}`];
    const invoiceReceiverPolicy =
        policies?.[`${ONYXKEYS.COLLECTION.POLICY}${chatReport?.invoiceReceiver && 'policyID' in chatReport.invoiceReceiver ? chatReport.invoiceReceiver.policyID : undefined}`];
    const invoiceReceiverPersonalDetail = chatReport?.invoiceReceiver && 'accountID' in chatReport.invoiceReceiver ? personalDetailsList?.[chatReport.invoiceReceiver.accountID] : null;
    const [iouReport, transactions, violations] = useReportWithTransactionsAndViolations(iouReportID);
    const policy = usePolicy(policyID);
    const lastTransaction = transactions?.at(0);
    const lastTransactionViolations = useTransactionViolations(lastTransaction?.transactionID);
    const isTrackExpenseAction = isTrackExpenseActionReportActionsUtils(action);
    const isSplitBillAction = isSplitBillActionReportActionsUtils(action);
    const [currentWidth, setCurrentWidth] = useState<number>(0);
    const [currentWrapperWidth, setCurrentWrapperWidth] = useState<number>(0);
    const reportPreviewStyles = useMemo(
        () => StyleUtils.getMoneyRequestReportPreviewStyle(shouldUseNarrowLayout, transactions.length, currentWidth, currentWrapperWidth),
        [StyleUtils, currentWidth, currentWrapperWidth, shouldUseNarrowLayout, transactions.length],
    );
    const shouldShowPayerAndReceiver = useMemo(() => {
        if (!isIOUReport(iouReport) && action.childType !== CONST.REPORT.TYPE.IOU) {
            return false;
        }

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return transactions.some((transaction) => (transaction?.modifiedAmount || transaction?.amount) < 0);
    }, [transactions, action.childType, iouReport]);

    const openReportFromPreview = useCallback(() => {
        if (!iouReportID || contextMenuRef.current?.isContextMenuOpening) {
            return;
        }

        Performance.markStart(CONST.TIMING.OPEN_REPORT_FROM_PREVIEW);
        Timing.start(CONST.TIMING.OPEN_REPORT_FROM_PREVIEW);
        Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(iouReportID, undefined, undefined, undefined, undefined, Navigation.getActiveRoute()));
    }, [iouReportID]);

    const renderItem: ListRenderItem<Transaction> = ({item}) => (
        <TransactionPreview
            allReports={allReports}
            chatReportID={chatReportID}
            action={getIOUActionForReportID(item.reportID, item.transactionID)}
            contextAction={action}
            reportID={item.reportID}
            isBillSplit={isSplitBillAction}
            isTrackExpense={isTrackExpenseAction}
            contextMenuAnchor={contextMenuAnchor}
            isWhisper={isWhisper}
            isHovered={isHovered}
            iouReportID={iouReportID}
            containerStyles={[styles.h100, reportPreviewStyles.transactionPreviewCarouselStyle]}
            shouldDisplayContextMenu={shouldDisplayContextMenu}
            transactionPreviewWidth={reportPreviewStyles.transactionPreviewCarouselStyle.width}
            transactionID={item.transactionID}
            reportPreviewAction={action}
            onPreviewPressed={openReportFromPreview}
            shouldShowPayerAndReceiver={shouldShowPayerAndReceiver}
        />
    );

    return (
        <MoneyRequestReportPreviewContent
            iouReportID={iouReportID}
            chatReportID={chatReportID}
            iouReport={iouReport}
            chatReport={chatReport}
            action={action}
            containerStyles={[reportPreviewStyles.componentStyle]}
            contextMenuAnchor={contextMenuAnchor}
            isHovered={isHovered}
            isWhisper={isWhisper}
            checkIfContextMenuActive={checkIfContextMenuActive}
            onPaymentOptionsShow={onPaymentOptionsShow}
            onPaymentOptionsHide={onPaymentOptionsHide}
            transactions={transactions}
            violations={violations}
            policy={policy}
            invoiceReceiverPersonalDetail={invoiceReceiverPersonalDetail}
            invoiceReceiverPolicy={invoiceReceiverPolicy}
            lastTransactionViolations={lastTransactionViolations}
            renderTransactionItem={renderItem}
            onCarouselLayout={(e: LayoutChangeEvent) => {
                setCurrentWidth(e.nativeEvent.layout.width);
            }}
            onWrapperLayout={(e: LayoutChangeEvent) => {
                setCurrentWrapperWidth(e.nativeEvent.layout.width);
            }}
            currentWidth={currentWidth}
            reportPreviewStyles={reportPreviewStyles}
            shouldDisplayContextMenu={shouldDisplayContextMenu}
            isInvoice={isInvoice}
            onPress={openReportFromPreview}
            shouldShowBorder={shouldShowBorder}
        />
    );
}

MoneyRequestReportPreview.displayName = 'MoneyRequestReportPreview';

export default MoneyRequestReportPreview;
