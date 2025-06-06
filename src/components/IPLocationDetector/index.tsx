import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';
import { IconAlertCircle,IconExternalOpen, IconClear } from '@douyinfe/semi-icons';

const IPLocationDetector: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('');
  
  const handleCancel = useCallback(() => {
    setVisible(false);
    // 用户关闭提示后，记录状态避免重复显示（当前会话）
    sessionStorage.setItem('overseasNotificationShown', 'true');
  }, []);

  const handleDontShowFor7Days = useCallback(() => {
    setVisible(false);
    // 设置7天内不再提示
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    localStorage.setItem('overseasNotificationDisabledUntil', sevenDaysFromNow.toISOString());
  }, []);

  const checkIfShouldShow = () => {
    // 检查是否在7天禁用期内
    const disabledUntil = localStorage.getItem('overseasNotificationDisabledUntil');
    if (disabledUntil) {
      const disabledDate = new Date(disabledUntil);
      const now = new Date();
      if (now < disabledDate) {
        return false; // 仍在禁用期内
      } else {
        // 禁用期已过，清除记录
        localStorage.removeItem('overseasNotificationDisabledUntil');
      }
    }
    
    // 检查当前会话是否已显示过
    const sessionShown = sessionStorage.getItem('overseasNotificationShown');
    return !sessionShown;
  };

  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // 使用免费的IP地理位置API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // 判断是否为国外用户（非中国大陆、香港、澳门、台湾）
        const chineseRegions = ['CN', 'HK', 'MO', 'TW'];
        const isFromOverseas = !chineseRegions.includes(data.country_code);
        
        // 如果是国外用户，显示Modal提示
        if (isFromOverseas) {
          setUserLocation(data.country || '海外地区');
          setVisible(true);
        }
        
      } catch (error) {
        console.warn('IP地址检测失败:', error);
      }
    };
    
    // 检查是否应该显示提示
    if (checkIfShouldShow()) {
      // 延迟执行，避免影响页面加载
      setTimeout(detectUserLocation, 300);
    }
  }, []);

  return (
    <>
      <Modal
        title={"Tips"}
        visible={visible}
        onCancel={handleCancel}
        centered
        bodyStyle={{overflow: 'auto'}}
        maskClosable={false}
        style={{width: "600px", fontSize: "17px", height: "210px"}}
        icon={<IconAlertCircle size='large'/>}
        footer={
          <div>
            <Button type="tertiary" size="large" onClick={handleDontShowFor7Days} icon={<IconClear />}>
              7d No Prompt
            </Button>
            <a href="https://www.rainbond.io" target="_blank">
              <Button type="primary" theme="solid" size='large' icon={<IconExternalOpen />}>
                Visit Int'l Site
              </Button>
            </a>
          </div>
        }
      >
        <p>Accessing from outside China? Visit Rainbond International Site.</p>
      </Modal>
    </>
  );
};

export default IPLocationDetector; 