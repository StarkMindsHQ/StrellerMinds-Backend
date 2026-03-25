#!/usr/bin/env node

/**
 * Service Layer Validation Script
 * 
 * This script validates that all service layer criteria are met:
 * 1. Business logic extracted from controllers to services
 * 2. Proper service layer patterns implemented
 * 3. Service interfaces for testability
 * 4. Dependency injection properly implemented
 * 5. Service layer documentation exists
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Service Layer Validation...\n');

// Validation Results
const results = {
  businessLogicExtracted: false,
  serviceLayerPatterns: false,
  serviceInterfaces: false,
  dependencyInjection: false,
  documentation: false,
  details: []
};

// 1. Check if business logic is extracted from controllers
function validateBusinessLogicExtraction() {
  console.log('📋 1. Validating Business Logic Extraction...');
  
  const controllerPath = path.join(__dirname, '../src/user/user.controller.ts');
  const servicePath = path.join(__dirname, '../src/user/user.service.ts');
  
  if (fs.existsSync(controllerPath) && fs.existsSync(servicePath)) {
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    // Check if controller methods delegate to service
    const controllerDelegates = controllerContent.includes('this.userService.createUser') ||
                           controllerContent.includes('this.userService.updateUser') ||
                           controllerContent.includes('this.userService.findAll');
    
    // Check if service contains business logic
    const serviceHasBusinessLogic = serviceContent.includes('bcrypt.hash') ||
                                 serviceContent.includes('validate') ||
                                 serviceContent.includes('ActivityType');
    
    if (controllerDelegates && serviceHasBusinessLogic) {
      results.businessLogicExtracted = true;
      results.details.push('✅ Business logic properly extracted from controllers to services');
    } else {
      results.details.push('❌ Business logic extraction incomplete');
    }
  } else {
    results.details.push('❌ Controller or service files not found');
  }
}

// 2. Check service layer patterns
function validateServiceLayerPatterns() {
  console.log('🏗️  2. Validating Service Layer Patterns...');
  
  const baseServicePath = path.join(__dirname, '../src/common/services/base.service.ts');
  const transactionManagerPath = path.join(__dirname, '../src/common/services/transaction.service.ts');
  
  if (fs.existsSync(baseServicePath) && fs.existsSync(transactionManagerPath)) {
    const baseServiceContent = fs.readFileSync(baseServicePath, 'utf8');
    const transactionContent = fs.readFileSync(transactionManagerPath, 'utf8');
    
    const hasBaseService = baseServiceContent.includes('IBaseService') &&
                         baseServiceContent.includes('BaseService');
    
    const hasTransactionManager = transactionContent.includes('ITransactionManager') &&
                                 transactionContent.includes('executeInTransaction');
    
    if (hasBaseService && hasTransactionManager) {
      results.serviceLayerPatterns = true;
      results.details.push('✅ Service layer patterns properly implemented');
    } else {
      results.details.push('❌ Service layer patterns incomplete');
    }
  } else {
    results.details.push('❌ Base service or transaction manager not found');
  }
}

// 3. Check service interfaces
function validateServiceInterfaces() {
  console.log('🔌 3. Validating Service Interfaces...');
  
  const userInterfacePath = path.join(__dirname, '../src/user/interfaces/user-service.interface.ts');
  const authInterfacePath = path.join(__dirname, '../src/auth/interfaces/auth-service.interface.ts');
  const courseInterfacePath = path.join(__dirname, '../src/course/interfaces/course-service.interface.ts');
  
  const interfacesExist = fs.existsSync(userInterfacePath) &&
                        fs.existsSync(authInterfacePath) &&
                        fs.existsSync(courseInterfacePath);
  
  if (interfacesExist) {
    const userInterface = fs.readFileSync(userInterfacePath, 'utf8');
    const authInterface = fs.readFileSync(authInterfacePath, 'utf8');
    
    const hasUserInterface = userInterface.includes('IUserService') &&
                           userInterface.includes('createUser') &&
                           userInterface.includes('updateUser');
    
    const hasAuthInterface = authInterface.includes('IAuthService') &&
                           authInterface.includes('register') &&
                           authInterface.includes('login');
    
    if (hasUserInterface && hasAuthInterface) {
      results.serviceInterfaces = true;
      results.details.push('✅ Service interfaces properly defined for testability');
    } else {
      results.details.push('❌ Service interfaces incomplete');
    }
  } else {
    results.details.push('❌ Service interface files not found');
  }
}

// 4. Check dependency injection
function validateDependencyInjection() {
  console.log('💉 4. Validating Dependency Injection...');
  
  const userModulePath = path.join(__dirname, '../src/user/user.module.ts');
  const commonModulePath = path.join(__dirname, '../src/common/common.module.ts');
  const appModulePath = path.join(__dirname, '../src/app.module.ts');
  
  if (fs.existsSync(userModulePath) && fs.existsSync(commonModulePath) && fs.existsSync(appModulePath)) {
    const userModule = fs.readFileSync(userModulePath, 'utf8');
    const commonModule = fs.readFileSync(commonModulePath, 'utf8');
    const appModule = fs.readFileSync(appModulePath, 'utf8');
    
    const hasUserModuleDI = userModule.includes('@Injectable') ||
                            userModule.includes('CommonModule');
    
    const hasCommonModule = commonModule.includes('TransactionManager') ||
                            commonModule.includes('providers');
    
    const hasAppModuleImport = appModule.includes('CommonModule');
    
    if (hasUserModuleDI && hasCommonModule && hasAppModuleImport) {
      results.dependencyInjection = true;
      results.details.push('✅ Dependency injection properly implemented');
    } else {
      results.details.push('❌ Dependency injection setup incomplete');
    }
  } else {
    results.details.push('❌ Module files not found');
  }
}

// 5. Check documentation
function validateDocumentation() {
  console.log('📚 5. Validating Service Layer Documentation...');
  
  const docsPath = path.join(__dirname, '../docs/service-layer-architecture.md');
  
  if (fs.existsSync(docsPath)) {
    const docsContent = fs.readFileSync(docsPath, 'utf8');
    
    const hasComprehensiveDocs = docsContent.includes('Service Layer Architecture') &&
                               docsContent.includes('BaseService') &&
                               docsContent.includes('Dependency Injection') &&
                               docsContent.includes('Interface-Based Design') &&
                               docsContent.includes('Validation Framework');
    
    if (hasComprehensiveDocs) {
      results.documentation = true;
      results.details.push('✅ Comprehensive service layer documentation exists');
    } else {
      results.details.push('❌ Service layer documentation incomplete');
    }
  } else {
    results.details.push('❌ Service layer documentation not found');
  }
}

// Run all validations
function runValidations() {
  validateBusinessLogicExtraction();
  validateServiceLayerPatterns();
  validateServiceInterfaces();
  validateDependencyInjection();
  validateDocumentation();
}

// Generate report
function generateReport() {
  console.log('\n📊 VALIDATION REPORT');
  console.log('====================\n');
  
  const criteria = [
    { name: 'Business Logic Extraction', passed: results.businessLogicExtracted },
    { name: 'Service Layer Patterns', passed: results.serviceLayerPatterns },
    { name: 'Service Interfaces', passed: results.serviceInterfaces },
    { name: 'Dependency Injection', passed: results.dependencyInjection },
    { name: 'Documentation', passed: results.documentation }
  ];
  
  criteria.forEach(criteria => {
    const status = criteria.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${criteria.name}`);
  });
  
  console.log('\n📝 Details:');
  results.details.forEach(detail => console.log(`  ${detail}`));
  
  const passedCount = criteria.filter(c => c.passed).length;
  const totalCount = criteria.length;
  const percentage = Math.round((passedCount / totalCount) * 100);
  
  console.log(`\n🎯 Overall Score: ${passedCount}/${totalCount} (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('🎉 All service layer criteria successfully implemented!');
  } else {
    console.log('⚠️  Some criteria need attention. Please review the details above.');
  }
  
  return percentage === 100;
}

// Execute validation
runValidations();
const success = generateReport();

// Exit with appropriate code
process.exit(success ? 0 : 1);
